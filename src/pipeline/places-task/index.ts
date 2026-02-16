/**
 * Google Places Ingestion Task (Fargate)
 *
 * Reads search queries from S3, calls Google Places Text Search API with full field mask
 * (Pro + Enterprise + Atmosphere), paginates up to maxResultsPerSearch per query,
 * creates SearchQuery records, upserts leads into Postgres with franchise grouping.
 *
 * Environment:
 *   JOB_INPUT - JSON: { jobId, campaignId, campaignRunId, searchesS3Key, skipCachedSearches, maxResultsPerSearch }
 *   GOOGLE_API_KEY - Google Places API key
 *   DATABASE_SECRET_ARN - RDS secret ARN (Secrets Manager)
 *   DATABASE_HOST - RDS host
 *   CAMPAIGN_DATA_BUCKET - S3 bucket for campaign data
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;

async function getDatabaseUrl(): Promise<string> {
  const secretArn = process.env.DATABASE_SECRET_ARN;
  const host = process.env.DATABASE_HOST;
  if (!secretArn || !host) {
    throw new Error('DATABASE_SECRET_ARN and DATABASE_HOST are required');
  }
  const sm = new SecretsManagerClient({});
  const res = await sm.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const secret = JSON.parse(res.SecretString!);
  const { username, password, dbname } = secret;
  const port = secret.port ?? 5432;
  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${dbname}?sslmode=require`;
}

const RATE_LIMIT_PER_SECOND = 5;
let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const minInterval = 1000 / RATE_LIMIT_PER_SECOND;
  if (elapsed < minInterval) {
    await new Promise((r) => setTimeout(r, minInterval - elapsed));
  }
  lastRequestTime = Date.now();
}

// Full field mask: Pro + Enterprise + Atmosphere (reviewSummary, not reviews)
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.utcOffsetMinutes',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.priceRange',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.editorialSummary',
  'places.reviewSummary',
  'nextPageToken',
].join(',');

interface SearchQueryInput {
  textQuery: string;
  includedType?: string;
}

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  types?: string[];
  formattedAddress?: string;
  addressComponents?: Array<{ longText: string; shortText: string; types: string[] }>;
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
  businessStatus?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  priceRange?: { startPrice?: { units: string }; endPrice?: { units: string } };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  editorialSummary?: { text: string };
  reviewSummary?: { text?: string };
}

interface SearchResponse {
  places?: PlaceResult[];
  nextPageToken?: string;
}

function mapPriceLevel(level?: string): number | null {
  if (!level) return null;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[level] ?? null;
}

function extractAddressComponent(
  components: PlaceResult['addressComponents'],
  type: string
): string {
  if (!components) return '';
  const c = components.find((x) => x.types?.includes(type));
  return c?.longText || c?.shortText || '';
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function searchPlaces(
  textQuery: string,
  maxResults: number
): Promise<PlaceResult[]> {
  const allPlaces: PlaceResult[] = [];
  let pageToken: string | undefined;
  const max = Math.min(maxResults, 60);
  let consecutiveEmpty = 0;
  const MAX_EMPTY = 3;

  do {
    await rateLimit();

    const body: Record<string, unknown> = { textQuery, pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`Google Places API error: ${response.status} - ${err.slice(0, 300)}`);
      break;
    }

    const data = (await response.json()) as SearchResponse;
    const places = data.places || [];

    if (places.length === 0) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= MAX_EMPTY) break;
    } else {
      consecutiveEmpty = 0;
    }

    allPlaces.push(...places);
    pageToken = data.nextPageToken;

    if (pageToken && allPlaces.length < max) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  } while (pageToken && allPlaces.length < max);

  return allPlaces.slice(0, max);
}

async function ensureFranchiseAndLink(
  pg: Client,
  name: string,
  nameNormalized: string,
  placeId: string
): Promise<string | null> {
  const existingFranchise = await pg.query(
    `SELECT id FROM franchises WHERE name = $1`,
    [nameNormalized]
  );
  if (existingFranchise.rows.length > 0) {
    return existingFranchise.rows[0].id;
  }

  const existingLead = await pg.query(
    `SELECT id FROM leads WHERE name_normalized = $1 LIMIT 1`,
    [nameNormalized]
  );
  if (existingLead.rows.length > 0) {
    const franchiseResult = await pg.query(
      `INSERT INTO franchises (id, name, display_name, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       RETURNING id`,
      [nameNormalized, name]
    );
    const franchiseId = franchiseResult.rows[0].id;
    await pg.query(
      `UPDATE leads SET franchise_id = $1, updated_at = NOW() WHERE name_normalized = $2`,
      [franchiseId, nameNormalized]
    );
    return franchiseId;
  }

  return null;
}

async function main() {
  const jobInput = JSON.parse(process.env.JOB_INPUT || '{}');
  const {
    jobId,
    campaignId,
    campaignRunId,
    searchesS3Key,
    skipCachedSearches = false,
    maxResultsPerSearch = 60,
  } = jobInput;

  if (!campaignId || !searchesS3Key) {
    console.error('campaignId and searchesS3Key required');
    process.exit(1);
  }

  const databaseUrl = await getDatabaseUrl();
  const pg = new Client({ connectionString: databaseUrl });
  await pg.connect();

  const updateJobStatus = async (status: string, errorMessage?: string) => {
    if (!jobId) return;
    await pg.query(
      `UPDATE jobs SET status = $1, completed_at = NOW(), error_message = $2, updated_at = NOW() WHERE id = $3`,
      [status, errorMessage || null, jobId]
    );
  };

  try {
    const s3Result = await s3Client.send(
      new GetObjectCommand({ Bucket: CAMPAIGN_DATA_BUCKET, Key: searchesS3Key })
    );
    const body = await s3Result.Body?.transformToString();
    if (!body) {
      await updateJobStatus('failed', 'Empty searches file');
      process.exit(1);
    }

    const { searches = [] } = JSON.parse(body) as { searches?: SearchQueryInput[] };
    if (searches.length === 0) {
      await updateJobStatus('completed');
      await pg.query(
        `UPDATE campaign_runs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [campaignRunId]
      );
      return;
    }

    let leadsFound = 0;
    let duplicatesSkipped = 0;
    let queriesExecuted = 0;
    let errors = 0;
    const seenPlaceIds = new Set<string>();
    const CACHE_DAYS = 30;

    for (let i = 0; i < searches.length; i++) {
      const q = searches[i];
      const textQuery = typeof q === 'string' ? q : q.textQuery;
      const includedType = typeof q === 'object' ? q.includedType : undefined;

      if (skipCachedSearches) {
        const cached = await pg.query(
          `SELECT id FROM search_queries
           WHERE text_query = $1 AND (included_type = $2 OR (included_type IS NULL AND $2 IS NULL))
           AND created_at > NOW() - ($3::text || ' days')::interval
           LIMIT 1`,
          [textQuery, includedType ?? null, String(CACHE_DAYS)]
        );
        if (cached.rows.length > 0) {
          console.log(`[${i + 1}/${searches.length}] Skipped (cached): "${textQuery}"`);
          queriesExecuted++;
          continue;
        }
      }

      const places = await searchPlaces(textQuery, maxResultsPerSearch);
      queriesExecuted++;

      const searchQueryResult = await pg.query(
        `INSERT INTO search_queries (id, text_query, included_type, campaign_id, campaign_run_id, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
         RETURNING id`,
        [textQuery, includedType ?? null, campaignId, campaignRunId ?? null]
      );
      const searchQueryId = searchQueryResult.rows[0].id;

      for (const place of places) {
        if (place.businessStatus === 'CLOSED_PERMANENTLY') continue;
        if (seenPlaceIds.has(place.id)) continue;
        seenPlaceIds.add(place.id);

        const name = place.displayName?.text || 'Unknown';
        const nameNormalized = normalizeName(name);
        const city = extractAddressComponent(place.addressComponents, 'locality') ||
          extractAddressComponent(place.addressComponents, 'sublocality');
        const state = extractAddressComponent(place.addressComponents, 'administrative_area_level_1');
        const zipCode = extractAddressComponent(place.addressComponents, 'postal_code');
        const openingHours = place.regularOpeningHours?.weekdayDescriptions?.join('; ') ?? null;
        const editorialSummary = place.editorialSummary?.text ?? null;
        const reviewSummary = place.reviewSummary?.text ?? null;

        let franchiseId: string | null = null;
        try {
          franchiseId = await ensureFranchiseAndLink(pg, name, nameNormalized, place.id);
        } catch (e) {
          console.warn(`Franchise link failed for ${place.id}:`, e);
        }

        try {
          const result = await pg.query(
            `INSERT INTO leads (
              id, place_id, campaign_id, campaign_run_id, search_query_id, franchise_id,
              name, name_normalized, address, city, state, zip_code, phone, website,
              rating, review_count, price_level, business_type, source,
              business_status, latitude, longitude, primary_type, opening_hours,
              editorial_summary, review_summary, google_maps_uri,
              created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, 'google_places',
              $18, $19, $20, $21, $22, $23, $24, $25,
              NOW(), NOW()
            )
            ON CONFLICT (place_id) DO NOTHING
            RETURNING id`,
            [
              place.id,
              campaignId,
              campaignRunId ?? null,
              searchQueryId,
              franchiseId,
              name,
              nameNormalized,
              place.formattedAddress ?? null,
              city || null,
              state || null,
              zipCode || null,
              place.nationalPhoneNumber ?? null,
              place.websiteUri ?? null,
              place.rating ?? null,
              place.userRatingCount ?? null,
              mapPriceLevel(place.priceLevel),
              place.primaryTypeDisplayName?.text ?? place.primaryType ?? null,
              place.businessStatus ?? null,
              place.location?.latitude ?? null,
              place.location?.longitude ?? null,
              place.primaryType ?? null,
              openingHours,
              editorialSummary,
              reviewSummary,
              place.googleMapsUri ?? null,
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

      console.log(`[${i + 1}/${searches.length}] "${textQuery}": ${places.length} results, ${leadsFound} new, ${duplicatesSkipped} dup`);
    }

    if (campaignRunId) {
      await pg.query(
        `UPDATE campaign_runs SET
           queries_executed = $1, leads_found = $2, duplicates_skipped = $3, errors = $4,
           status = 'completed', completed_at = NOW()
         WHERE id = $5`,
        [queriesExecuted, leadsFound, duplicatesSkipped, errors, campaignRunId]
      );
    }

    await updateJobStatus('completed');
    console.log(`Places task complete: ${leadsFound} new, ${duplicatesSkipped} dup, ${errors} errors`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Places task failed:', err);
    await updateJobStatus('failed', msg);
    process.exit(1);
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
