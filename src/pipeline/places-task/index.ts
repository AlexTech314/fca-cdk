/**
 * Google Places Ingestion Task (Fargate)
 *
 * Reads search queries from S3, calls Google Places Text Search API at 5 req/sec,
 * upserts leads into Postgres (dedupe by placeId).
 *
 * Environment:
 *   JOB_INPUT - JSON string with { campaignId, searchesS3Key, maxResultsPerSearch }
 *   GOOGLE_API_KEY - Google Places API key
 *   DATABASE_URL - PostgreSQL connection string (via RDS Proxy)
 *   CAMPAIGN_DATA_BUCKET - S3 bucket for campaign data
 */

import { Client } from 'pg';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;

// Rate limiting: 5 requests per second
const RATE_LIMIT_PER_SECOND = 5;
let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const minInterval = 1000 / RATE_LIMIT_PER_SECOND;
  if (elapsed < minInterval) {
    await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
  }
  lastRequestTime = Date.now();
}

interface SearchQuery {
  textQuery: string;
  includedType?: string;
}

interface PlaceResult {
  id: string;          // Google Places ID
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: Array<{ types: string[]; longText: string }>;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryTypeDisplayName?: { text: string };
}

async function searchPlaces(query: SearchQuery): Promise<PlaceResult[]> {
  await rateLimit();

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.addressComponents',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.primaryTypeDisplayName',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: query.textQuery,
      ...(query.includedType ? { includedType: query.includedType } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Google Places API error: ${response.status} - ${error}`);
    return [];
  }

  const data = await response.json() as { places?: PlaceResult[] };
  return data.places || [];
}

function extractCityState(place: PlaceResult): { city: string | null; state: string | null; zipCode: string | null } {
  const components = place.addressComponents || [];
  let city: string | null = null;
  let state: string | null = null;
  let zipCode: string | null = null;

  for (const comp of components) {
    if (comp.types.includes('locality')) city = comp.longText;
    if (comp.types.includes('administrative_area_level_1')) state = comp.longText;
    if (comp.types.includes('postal_code')) zipCode = comp.longText;
  }

  return { city, state, zipCode };
}

async function main() {
  const jobInput = JSON.parse(process.env.JOB_INPUT || '{}');
  const { campaignId, searchesS3Key, campaignRunId } = jobInput;

  console.log(`Places task starting - campaign: ${campaignId}, searches: ${searchesS3Key}`);

  // Fetch searches from S3
  const s3Result = await s3Client.send(new GetObjectCommand({
    Bucket: CAMPAIGN_DATA_BUCKET,
    Key: searchesS3Key,
  }));
  const body = await s3Result.Body?.transformToString();
  if (!body) {
    console.error('Empty searches file');
    process.exit(1);
  }

  const searchesData = JSON.parse(body);
  const searches: SearchQuery[] = searchesData.searches || [];
  console.log(`Loaded ${searches.length} search queries`);

  // Connect to Postgres
  const pgClient = new Client({ connectionString: DATABASE_URL });
  await pgClient.connect();

  let leadsFound = 0;
  let duplicatesSkipped = 0;
  let queriesExecuted = 0;
  let errors = 0;

  try {
    for (const query of searches) {
      try {
        const places = await searchPlaces(query);
        queriesExecuted++;

        for (const place of places) {
          const { city, state, zipCode } = extractCityState(place);

          try {
            // Upsert: insert or skip if placeId already exists
            const result = await pgClient.query(
              `INSERT INTO leads (id, place_id, campaign_id, campaign_run_id, name, address, city, state, zip_code, phone, website, rating, review_count, business_type, source, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'google_places', NOW(), NOW())
               ON CONFLICT (place_id) DO NOTHING
               RETURNING id`,
              [
                place.id,
                campaignId || null,
                campaignRunId || null,
                place.displayName?.text || 'Unknown',
                place.formattedAddress || null,
                city,
                state,
                zipCode,
                place.nationalPhoneNumber || null,
                place.websiteUri || null,
                place.rating || null,
                place.userRatingCount || null,
                place.primaryTypeDisplayName?.text || null,
              ]
            );

            if (result.rowCount && result.rowCount > 0) {
              leadsFound++;
            } else {
              duplicatesSkipped++;
            }
          } catch (e) {
            console.error(`Failed to upsert place ${place.id}:`, e);
            errors++;
          }
        }

        console.log(`Query "${query.textQuery}": ${places.length} results (${queriesExecuted}/${searches.length})`);
      } catch (e) {
        console.error(`Failed to search "${query.textQuery}":`, e);
        errors++;
        queriesExecuted++;
      }
    }

    // Update campaign run metrics
    if (campaignRunId) {
      await pgClient.query(
        `UPDATE campaign_runs SET
           queries_executed = $1,
           leads_found = $2,
           duplicates_skipped = $3,
           errors = $4,
           status = 'completed',
           completed_at = NOW()
         WHERE id = $5`,
        [queriesExecuted, leadsFound, duplicatesSkipped, errors, campaignRunId]
      );
    }

    console.log(`Places task complete: ${leadsFound} new leads, ${duplicatesSkipped} duplicates, ${errors} errors`);
  } finally {
    await pgClient.end();
  }
}

main().catch((error) => {
  console.error('Places task failed:', error);
  process.exit(1);
});
