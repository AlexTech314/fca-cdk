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

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl, prisma } from '@fca/db';

const s3Client = new S3Client({});
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;

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
  maxResults: number,
  requestBudget?: { remaining: number }
): Promise<PlaceResult[]> {
  const allPlaces: PlaceResult[] = [];
  let pageToken: string | undefined;
  const max = Math.min(maxResults, 60);
  let consecutiveEmpty = 0;
  const MAX_EMPTY = 3;

  do {
    if (requestBudget && requestBudget.remaining <= 0) {
      console.log(`Request budget exhausted, stopping pagination for "${textQuery}"`);
      break;
    }
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

    if (requestBudget) requestBudget.remaining--;

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
  name: string,
  nameNormalized: string,
): Promise<string | null> {
  const existingFranchise = await prisma.franchise.findUnique({
    where: { name: nameNormalized },
  });
  if (existingFranchise) return existingFranchise.id;

  const existingLead = await prisma.lead.findFirst({
    where: { nameNormalized },
    select: { id: true },
  });

  if (existingLead) {
    const franchise = await prisma.franchise.create({
      data: { name: nameNormalized, displayName: name },
    });
    await prisma.lead.updateMany({
      where: { nameNormalized },
      data: { franchiseId: franchise.id },
    });
    return franchise.id;
  }

  return null;
}

async function main() {
  await bootstrapDatabaseUrl();

  const jobInput = JSON.parse(process.env.JOB_INPUT || '{}');
  const {
    jobId,
    campaignId,
    campaignRunId,
    searchesS3Key,
    skipCachedSearches = false,
    maxResultsPerSearch = 60,
    maxTotalRequests,
  } = jobInput;

  if (!campaignId || !searchesS3Key) {
    console.error('campaignId and searchesS3Key required');
    process.exit(1);
  }

  const updateJobStatus = async (status: string, errorMessage?: string) => {
    if (!jobId) return;
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        completedAt: new Date(),
        errorMessage: errorMessage || null,
      },
    });
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
      if (campaignRunId) {
        await prisma.campaignRun.update({
          where: { id: campaignRunId },
          data: { status: 'completed', completedAt: new Date() },
        });
      }
      return;
    }

    let leadsFound = 0;
    let duplicatesSkipped = 0;
    let queriesExecuted = 0;
    let errors = 0;
    const seenPlaceIds = new Set<string>();
    const CACHE_DAYS = 30;
    const requestBudget = typeof maxTotalRequests === 'number' && maxTotalRequests > 0
      ? { remaining: maxTotalRequests }
      : undefined;

    for (let i = 0; i < searches.length; i++) {
      if (requestBudget && requestBudget.remaining <= 0) {
        console.log(`Request budget exhausted after ${queriesExecuted} queries, stopping`);
        break;
      }
      const q = searches[i];
      const textQuery = typeof q === 'string' ? q : q.textQuery;
      const includedType = typeof q === 'object' ? q.includedType : undefined;

      if (skipCachedSearches) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - CACHE_DAYS);
        const cached = await prisma.searchQuery.findFirst({
          where: {
            textQuery,
            includedType: includedType ?? null,
            createdAt: { gt: cutoff },
          },
          select: { id: true },
        });
        if (cached) {
          console.log(`[${i + 1}/${searches.length}] Skipped (cached): "${textQuery}"`);
          queriesExecuted++;
          continue;
        }
      }

      const places = await searchPlaces(textQuery, maxResultsPerSearch, requestBudget);
      queriesExecuted++;

      const searchQuery = await prisma.searchQuery.create({
        data: {
          textQuery,
          includedType: includedType ?? null,
          campaignId,
          campaignRunId: campaignRunId ?? null,
        },
      });

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
          franchiseId = await ensureFranchiseAndLink(name, nameNormalized);
        } catch (e) {
          console.warn(`Franchise link failed for ${place.id}:`, e);
        }

        try {
          // Use raw upsert to handle ON CONFLICT (place_id) DO NOTHING
          const result = await prisma.$executeRaw`
            INSERT INTO leads (
              id, place_id, campaign_id, campaign_run_id, search_query_id, franchise_id,
              name, name_normalized, address, city, state, zip_code, phone, website,
              rating, review_count, price_level, business_type, source,
              business_status, latitude, longitude, primary_type, opening_hours,
              editorial_summary, review_summary, google_maps_uri,
              created_at, updated_at
            ) VALUES (
              gen_random_uuid(), ${place.id}, ${campaignId}, ${campaignRunId ?? null},
              ${searchQuery.id}, ${franchiseId},
              ${name}, ${nameNormalized}, ${place.formattedAddress ?? null},
              ${city || null}, ${state || null}, ${zipCode || null},
              ${place.nationalPhoneNumber ?? null}, ${place.websiteUri ?? null},
              ${place.rating ?? null}, ${place.userRatingCount ?? null},
              ${mapPriceLevel(place.priceLevel)},
              ${place.primaryTypeDisplayName?.text ?? place.primaryType ?? null},
              'google_places',
              ${place.businessStatus ?? null},
              ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
              ${place.primaryType ?? null}, ${openingHours},
              ${editorialSummary}, ${reviewSummary}, ${place.googleMapsUri ?? null},
              NOW(), NOW()
            )
            ON CONFLICT (place_id) DO NOTHING`;

          if (result > 0) {
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
      await prisma.campaignRun.update({
        where: { id: campaignRunId },
        data: {
          queriesExecuted,
          leadsFound,
          duplicatesSkipped,
          errors,
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }

    await updateJobStatus('completed');
    console.log(`Places task complete: ${leadsFound} new, ${duplicatesSkipped} dup, ${errors} errors`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Places task failed:', err);
    await updateJobStatus('failed', msg);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
