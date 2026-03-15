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
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;
const SCRAPE_QUEUE_URL = process.env.SCRAPE_QUEUE_URL;

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

/** Generic Google types that don't convey meaningful business information */
const GENERIC_TYPES = new Set([
  'establishment', 'point_of_interest', 'store', 'food', 'health',
  'finance', 'general_contractor', 'political', 'locality',
  'sublocality', 'route', 'street_address',
]);

/** Convert a snake_case Google type code to a human-readable title */
function humanizeType(typeCode: string): string {
  return typeCode
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Get the best business type string from a PlaceResult */
function resolveBusinessType(place: PlaceResult): string | null {
  if (place.primaryTypeDisplayName?.text) return place.primaryTypeDisplayName.text;
  if (place.primaryType) return humanizeType(place.primaryType);
  // Fallback: first non-generic type from the types array
  if (place.types?.length) {
    const meaningful = place.types.find((t) => !GENERIC_TYPES.has(t));
    if (meaningful) return humanizeType(meaningful);
  }
  return null;
}

/** Get the best primary type code from a PlaceResult */
function resolvePrimaryType(place: PlaceResult): string | null {
  if (place.primaryType) return place.primaryType;
  if (place.types?.length) {
    return place.types.find((t) => !GENERIC_TYPES.has(t)) ?? null;
  }
  return null;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Strip UTM and other tracking params from Google Places website URLs */
function sanitizeWebsiteUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'gclid', 'fbclid', 'ref', 'source',
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    const href = parsed.href;
    return href.endsWith('?') ? href.slice(0, -1) : href;
  } catch {
    return null;
  }
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
  prisma: PrismaClient,
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
  const prisma = new PrismaClient();

  const jobInput = JSON.parse(process.env.JOB_INPUT || '{}');
  const {
    taskId,
    jobId,
    campaignId,
    campaignRunId,
    searchesS3Key,
    skipCachedSearches = false,
    maxResultsPerSearch = 60,
    maxTotalRequests,
  } = jobInput;

  const fargateTaskId = taskId ?? jobId;

  if (!campaignId || !searchesS3Key) {
    console.error('campaignId and searchesS3Key required');
    process.exit(1);
  }

  const updateTaskStatus = async (status: 'completed' | 'failed', errorMessage?: string) => {
    if (!fargateTaskId) return;
    await prisma.fargateTask.update({
      where: { id: fargateTaskId },
      data: {
        status,
        completedAt: new Date(),
        errorMessage: errorMessage || null,
      },
    });
  };

  try {
    let body: string | undefined;
    const localFile = process.env.SEARCHES_FILE;
    if (localFile) {
      console.log(`Reading searches from local file: ${localFile}`);
      body = fs.readFileSync(localFile, 'utf-8');
    } else {
      const s3Result = await s3Client.send(
        new GetObjectCommand({ Bucket: CAMPAIGN_DATA_BUCKET, Key: searchesS3Key })
      );
      body = await s3Result.Body?.transformToString();
    }
    if (!body) {
      await updateTaskStatus('failed', 'Empty searches file');
      process.exit(1);
    }

    const { searches = [] } = JSON.parse(body) as { searches?: SearchQueryInput[] };
    if (searches.length === 0) {
      await updateTaskStatus('completed');
      if (campaignRunId) {
        await prisma.campaignRun.update({
          where: { id: campaignRunId },
          data: { status: 'completed', completedAt: new Date() },
        });
      }
      return;
    }

    // Check campaign's enable_web_scraping flag (all leads in a run share the same campaign)
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      select: { enableWebScraping: true, enableAiScoring: true, enableContactExtraction: true },
    });
    const enableWebScraping = campaign.enableWebScraping && !!SCRAPE_QUEUE_URL;
    const enableAiScoring = campaign.enableAiScoring;
    const enableContactExtraction = campaign.enableContactExtraction;

    // Pre-load geography lookups to avoid N+1 queries per place
    const allStates = await prisma.state.findMany();
    const stateById = new Map(allStates.map((s) => [s.id.toLowerCase(), s]));
    const stateByName = new Map(allStates.map((s) => [s.name.toLowerCase(), s]));

    const allCities = await prisma.city.findMany({ select: { id: true, name: true, stateId: true } });
    const cityByStateAndName = new Map<string, { id: number }>();
    for (const c of allCities) {
      cityByStateAndName.set(`${c.stateId.toLowerCase()}:${c.name.toLowerCase()}`, c);
    }
    // Next available city ID for cities discovered via Google Places
    let nextCityId = allCities.reduce((max, c) => Math.max(max, c.id), 0) + 1;

    let leadsFound = 0;
    let duplicatesSkipped = 0;
    let queriesExecuted = 0;
    let errors = 0;
    const seenPlaceIds = new Set<string>();
    const maxResult = await prisma.$queryRaw<[{ max: number | null }]>`SELECT MAX(sort_index) as max FROM leads`;
    const sortCeiling = (maxResult[0]?.max ?? 0) + 1;
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
        const cityName = extractAddressComponent(place.addressComponents, 'locality') ||
          extractAddressComponent(place.addressComponents, 'sublocality');
        const stateShort = extractAddressComponent(place.addressComponents, 'administrative_area_level_1');
        const zipCode = extractAddressComponent(place.addressComponents, 'postal_code');
        const openingHours = place.regularOpeningHours?.weekdayDescriptions?.join('; ') ?? null;
        const editorialSummary = place.editorialSummary?.text ?? null;
        const reviewSummary = place.reviewSummary?.text ?? null;

        // Resolve geography FKs — create missing cities (Google Places is source of truth)
        let locationStateId: string | null = null;
        let locationCityId: number | null = null;
        if (stateShort) {
          const key = stateShort.toLowerCase();
          const stateRecord = stateById.get(key) ?? stateByName.get(key) ?? null;
          if (stateRecord) {
            locationStateId = stateRecord.id;
            if (cityName) {
              const cacheKey = `${stateRecord.id.toLowerCase()}:${cityName.toLowerCase()}`;
              const cityRecord = cityByStateAndName.get(cacheKey);
              if (cityRecord) {
                locationCityId = cityRecord.id;
              } else {
                // City not in DB — create it from Google Places data
                try {
                  const newCity = await prisma.city.create({
                    data: { id: nextCityId++, name: cityName, stateId: stateRecord.id },
                  });
                  cityByStateAndName.set(cacheKey, { id: newCity.id });
                  locationCityId = newCity.id;
                  console.log(`Created city: ${cityName}, ${stateRecord.id} (id=${newCity.id})`);
                } catch (e) {
                  // Unique constraint hit (race or duplicate) — look up existing
                  const existing = await prisma.city.findUnique({
                    where: { name_stateId: { name: cityName, stateId: stateRecord.id } },
                    select: { id: true },
                  });
                  if (existing) {
                    cityByStateAndName.set(cacheKey, { id: existing.id });
                    locationCityId = existing.id;
                  } else {
                    console.warn(`Failed to create city ${cityName}, ${stateRecord.id}:`, e);
                  }
                }
              }
            }
          }
        }

        let franchiseId: string | null = null;
        try {
          franchiseId = await ensureFranchiseAndLink(prisma, name, nameNormalized);
        } catch (e) {
          console.warn(`Franchise link failed for ${place.id}:`, e);
        }

        // Link franchise to geography via junction tables
        if (franchiseId && locationStateId) {
          try {
            await prisma.franchiseState.upsert({
              where: { franchiseId_stateId: { franchiseId, stateId: locationStateId } },
              update: {},
              create: { franchiseId, stateId: locationStateId },
            });
            if (locationCityId) {
              await prisma.franchiseCity.upsert({
                where: { franchiseId_cityId: { franchiseId, cityId: locationCityId } },
                update: {},
                create: { franchiseId, cityId: locationCityId },
              });
            }
          } catch (e) {
            console.warn(`Franchise geography link failed for ${place.id}:`, e);
          }
        }

        try {
          const googleMapsUri =
            place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${place.id}`;
          const leadSortIndex = sortCeiling + Math.random();
          const website = sanitizeWebsiteUrl(place.websiteUri) ?? null;
          const rows = await prisma.$queryRaw<{ id: string; place_id: string; website: string | null }[]>`
            INSERT INTO leads (
              id, place_id, campaign_id, campaign_run_id, search_query_id, franchise_id,
              location_state_id, location_city_id,
              name, name_normalized, address, zip_code, phone, website,
              rating, review_count, price_level, business_type, source,
              business_status, latitude, longitude, primary_type, google_types, opening_hours,
              editorial_summary, review_summary, google_maps_uri,
              sort_index,
              created_at, updated_at
            ) VALUES (
              gen_random_uuid(), ${place.id}, ${campaignId}, ${campaignRunId ?? null},
              ${searchQuery.id}, ${franchiseId},
              ${locationStateId}, ${locationCityId},
              ${name}, ${nameNormalized}, ${place.formattedAddress ?? null},
              ${zipCode || null},
              ${place.nationalPhoneNumber ?? null}, ${website},
              ${place.rating ?? null}, ${place.userRatingCount ?? null},
              ${mapPriceLevel(place.priceLevel)},
              ${resolveBusinessType(place)},
              'google_places',
              ${place.businessStatus ?? null},
              ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null},
              ${resolvePrimaryType(place)}, ${place.types ?? []}, ${openingHours},
              ${editorialSummary}, ${reviewSummary}, ${googleMapsUri},
              ${leadSortIndex},
              NOW(), NOW()
            )
            ON CONFLICT (place_id) DO NOTHING
            RETURNING id, place_id, website`;

          if (rows.length > 0) {
            leadsFound++;
            const inserted = rows[0];
            // Send to scrape queue if web scraping is enabled and lead has a website
            if (enableWebScraping && inserted.website) {
              try {
                await sqsClient.send(new SendMessageCommand({
                  QueueUrl: SCRAPE_QUEUE_URL,
                  MessageBody: JSON.stringify({
                    lead_id: inserted.id,
                    place_id: inserted.place_id,
                    website: inserted.website,
                    enableAiScoring,
                    enableContactExtraction,
                  }),
                }));
                await prisma.lead.update({
                  where: { id: inserted.id },
                  data: { pipelineStatus: 'queued_for_scrape' },
                });
              } catch (sqsErr) {
                console.error(`Failed to enqueue lead ${inserted.id} for scrape:`, sqsErr);
              }
            }
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

    await updateTaskStatus('completed');
    console.log(`Places task complete: ${leadsFound} new, ${duplicatesSkipped} dup, ${errors} errors`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Places task failed:', err);
    await updateTaskStatus('failed', msg);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
