#!/usr/bin/env node

/**
 * Enrich Flatirons Capital transaction data with Google Places API (New).
 *
 * Usage:
 *   node scripts/enrich-transactions.js                # enrich all rows
 *   node scripts/enrich-transactions.js --dry-run      # parse & print without API calls
 *   node scripts/enrich-transactions.js --limit 5      # only enrich first N rows
 *   node scripts/enrich-transactions.js --start 10     # start from row index 10
 *
 * Reads GOOGLE_API_KEY from src/api/.env.local
 * Outputs enriched JSON to src/packages/seed/data/flatirons_capital_transactions.json
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const MD_PATH = path.join(ROOT, 'src/packages/seed/data/flatirons_capital_transactions.md');
const OUT_PATH = path.join(ROOT, 'src/packages/seed/data/flatirons_capital_transactions.json');
const ENV_PATH = path.join(ROOT, 'src/api/.env.local');

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
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
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.priceRange',
  'places.regularOpeningHours',
  'places.editorialSummary',
  'places.reviewSummary',
].join(',');

const RATE_LIMIT_MS = 220; // ~4.5 req/s to stay under 5/s

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadApiKey() {
  const envText = fs.readFileSync(ENV_PATH, 'utf-8');
  const match = envText.match(/^GOOGLE_API_KEY=(.+)$/m);
  if (!match) throw new Error('GOOGLE_API_KEY not found in ' + ENV_PATH);
  return match[1].trim();
}

/** Parse the markdown table into structured rows. */
function parseMarkdown() {
  const md = fs.readFileSync(MD_PATH, 'utf-8');
  const lines = md.split('\n').filter((l) => l.startsWith('|'));
  // Skip header row and separator row
  const dataLines = lines.slice(2);

  return dataLines.map((line) => {
    const cols = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);

    // Extract URL from markdown link syntax [text](url)
    const extractUrl = (cell) => {
      const m = cell.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/);
      return m ? m[1] : null;
    };

    // Clean business name (remove markdown formatting)
    const cleanName = (cell) => cell.replace(/\[.*?\]\(.*?\)/g, '').trim() || cell;

    return {
      index: parseInt(cols[0], 10),
      businessName: cleanName(cols[1]) || cols[1],
      businessWebsite: extractUrl(cols[2]),
      businessWebsiteRaw: cols[2],
      peFirm: cols[3],
      peFirmWebsite: extractUrl(cols[4]),
      year: parseInt(cols[5], 10),
    };
  });
}

/** Determine if a row should be skipped (dead/closed/no-website businesses). */
function shouldSkip(row) {
  const raw = row.businessWebsiteRaw.toLowerCase();
  return (
    raw.includes('closed') ||
    raw.includes('defunct') ||
    raw.includes('no active site') ||
    raw.includes('no dedicated website') ||
    raw.includes('no standalone site') ||
    raw.includes('not found') ||
    raw.includes('absorbed')
  );
}

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/** Map Google's PRICE_LEVEL_* string to integer 1-4. */
function mapPriceLevel(priceLevel) {
  if (!priceLevel) return null;
  const map = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[priceLevel] ?? null;
}

/** Extract zip code from address components. */
function extractZipCode(addressComponents) {
  if (!addressComponents) return null;
  const postal = addressComponents.find((c) => c.types?.includes('postal_code'));
  return postal?.shortText ?? null;
}

/** Extract state code from address components. */
function extractState(addressComponents) {
  if (!addressComponents) return null;
  const state = addressComponents.find((c) =>
    c.types?.includes('administrative_area_level_1')
  );
  return state?.shortText ?? null;
}

/** Extract city from address components. */
function extractCity(addressComponents) {
  if (!addressComponents) return null;
  const city = addressComponents.find((c) => c.types?.includes('locality'));
  return city?.longText ?? null;
}

/** Clean website URL to match the codebase pattern. */
function sanitizeWebsiteUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Google Places lookup
// ---------------------------------------------------------------------------

async function lookupPlace(apiKey, businessName, websiteHint) {
  await rateLimit();

  // Build a search query — use business name, optionally with domain hint
  let textQuery = businessName;
  if (websiteHint) {
    try {
      const domain = new URL(websiteHint).hostname.replace('www.', '');
      textQuery = `${businessName} ${domain}`;
    } catch {
      // ignore bad URL
    }
  }

  const response = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, pageSize: 3 }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`  API error ${response.status}: ${err.slice(0, 200)}`);
    return null;
  }

  const data = await response.json();
  const places = data.places || [];

  if (places.length === 0) return null;

  // Pick the best match — prefer one whose website domain matches
  if (websiteHint && places.length > 1) {
    try {
      const targetDomain = new URL(websiteHint).hostname.replace('www.', '');
      const match = places.find((p) => {
        if (!p.websiteUri) return false;
        const placeDomain = new URL(p.websiteUri).hostname.replace('www.', '');
        return placeDomain === targetDomain;
      });
      if (match) return match;
    } catch {
      // ignore
    }
  }

  return places[0];
}

// ---------------------------------------------------------------------------
// Build enriched Lead-shaped record
// ---------------------------------------------------------------------------

function buildLeadRecord(row, place) {
  const openingHours = place?.regularOpeningHours?.weekdayDescriptions?.join('; ') ?? null;

  return {
    // Lead model fields
    placeId: place?.id ?? null,
    name: row.businessName,
    nameNormalized: row.businessName.toLowerCase().trim(),
    address: place?.formattedAddress ?? null,
    zipCode: extractZipCode(place?.addressComponents),
    city: extractCity(place?.addressComponents),
    state: extractState(place?.addressComponents),
    phone: place?.nationalPhoneNumber ?? null,
    website: sanitizeWebsiteUrl(place?.websiteUri) ?? sanitizeWebsiteUrl(row.businessWebsite),
    rating: place?.rating ?? null,
    reviewCount: place?.userRatingCount ?? null,
    priceLevel: mapPriceLevel(place?.priceLevel),
    businessType: place?.primaryTypeDisplayName?.text ?? place?.primaryType ?? null,
    primaryType: place?.primaryType ?? null,
    source: 'import',

    // Extended Places fields
    businessStatus: place?.businessStatus ?? null,
    latitude: place?.location?.latitude ?? null,
    longitude: place?.location?.longitude ?? null,
    openingHours,
    editorialSummary: place?.editorialSummary?.text ?? null,
    reviewSummary: place?.reviewSummary?.text ?? null,
    googleMapsUri: place?.googleMapsUri ?? null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
  const startIdx = args.indexOf('--start');
  const startFrom = startIdx !== -1 ? parseInt(args[startIdx + 1], 10) : 0;

  console.log('Parsing transactions from markdown...');
  const rows = parseMarkdown();
  console.log(`Found ${rows.length} transactions\n`);

  if (dryRun) {
    console.log('DRY RUN — no API calls will be made.\n');
    rows.slice(startFrom, startFrom + limit).forEach((r) => {
      const skip = shouldSkip(r) ? ' [SKIP]' : '';
      console.log(`  ${r.index}. ${r.businessName} — ${r.businessWebsite ?? 'no website'}${skip}`);
    });
    console.log(`\n${rows.filter((r) => !shouldSkip(r)).length} rows eligible for enrichment`);
    return;
  }

  const apiKey = loadApiKey();
  console.log('Google API key loaded.\n');

  // Load existing results for resume support
  let results = [];
  const enrichedPlaceIds = new Set();
  if (fs.existsSync(OUT_PATH)) {
    try {
      results = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
      results.forEach((r) => {
        if (r.placeId) enrichedPlaceIds.add(r.transactionIndex);
      });
      console.log(`Loaded ${results.length} existing results (${enrichedPlaceIds.size} with placeId). Will skip already-enriched rows.\n`);
    } catch {
      results = [];
    }
  }

  const eligible = rows
    .slice(startFrom)
    .filter((r) => !enrichedPlaceIds.has(r.index))
    .slice(0, limit);

  console.log(`Processing ${eligible.length} rows...\n`);

  let enriched = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of eligible) {
    const skip = shouldSkip(row);
    process.stdout.write(`  [${row.index}/${rows.length}] ${row.businessName}...`);

    if (skip) {
      const record = buildLeadRecord(row, null);
      record.exclusionReason += ' — website unavailable, skipped Places lookup';
      results.push(record);
      console.log(' skipped (no active website)');
      skipped++;
      continue;
    }

    const place = await lookupPlace(apiKey, row.businessName, row.businessWebsite);

    if (place) {
      const record = buildLeadRecord(row, place);
      results.push(record);
      console.log(` found → ${place.formattedAddress ?? 'no address'}`);
      enriched++;
    } else {
      const record = buildLeadRecord(row, null);
      results.push(record);
      console.log(' NOT FOUND');
      notFound++;
    }

    // Save incrementally every 5 rows
    if ((enriched + skipped + notFound) % 5 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    }
  }

  // Final save
  // Sort by transaction index for clean output
  results.sort((a, b) => a.transactionIndex - b.transactionIndex);
  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));

  console.log(`
Done!
  Enriched:  ${enriched}
  Skipped:   ${skipped} (dead/closed websites)
  Not found: ${notFound}
  Total:     ${results.length}

Output: ${OUT_PATH}
`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
