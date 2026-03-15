/**
 * Excel (.xlsx) generation utility for lead exports.
 *
 * Applies cleanup/transform steps on raw lead data:
 * 1. Drop columns that are 100% empty
 * 2. Reorder columns into logical groups
 * 3. Format phone numbers, zip codes, dates, numbers
 * 4. Sort by tier asc (nulls last), rating desc
 * 5. Style the spreadsheet professionally
 */

import ExcelJS from 'exceljs';
import { columnDefMap } from './export-columns';
import type { ExportColumnDef } from './export-columns';

// ── Complete column ordering (every possible key) ───────────────
const COLUMN_ORDER: string[] = [
  // Company identity
  'name', 'businessType', 'tier', 'controllingOwner', 'ownershipType',
  // Contact
  'bestContactFirstName', 'bestContactLastName', 'bestContactEmail',
  'bestContactPhone', 'bestContactLinkedin',
  'bestContactInstagram', 'bestContactFacebook', 'bestContactTwitter',
  // Location
  'address', 'city', 'state', 'zipCode', 'phone', 'website',
  // Scores
  'compositeScore', 'businessQualityScore', 'exitReadinessScore',
  'rating', 'reviewCount',
  // Analysis
  'isIntermediated', 'intermediationSignals',
  'isExcluded', 'exclusionReason', 'scoringRationale',
  // Sources & relations
  'campaignName', 'franchiseName', 'source',
  // Google Places detail
  'priceLevel', 'businessStatus', 'latitude', 'longitude',
  'editorialSummary', 'reviewSummary', 'googleMapsUri',
  // Scraping
  'webScrapedAt', 'contactPageUrl', 'pipelineStatus',
  // Extracted
  'contacts',
  // Meta
  'createdAt', 'updatedAt', 'scoredAt',
];

// ── Column widths ───────────────────────────────────────────────
const COLUMN_WIDTHS: Record<string, number> = {
  name: 36,
  businessType: 22,
  tier: 7,
  controllingOwner: 22,
  ownershipType: 16,
  bestContactFirstName: 16,
  bestContactLastName: 16,
  bestContactEmail: 28,
  bestContactPhone: 17,
  bestContactLinkedin: 38,
  bestContactInstagram: 18,
  bestContactFacebook: 18,
  bestContactTwitter: 18,
  address: 40,
  city: 16,
  state: 14,
  zipCode: 9,
  phone: 17,
  website: 30,
  compositeScore: 12,
  businessQualityScore: 11,
  exitReadinessScore: 11,
  rating: 9,
  reviewCount: 11,
  isIntermediated: 13,
  intermediationSignals: 30,
  isExcluded: 11,
  exclusionReason: 24,
  scoringRationale: 55,
  campaignName: 20,
  franchiseName: 20,
  source: 14,
  priceLevel: 11,
  businessStatus: 15,
  latitude: 12,
  longitude: 12,
  editorialSummary: 35,
  reviewSummary: 35,
  googleMapsUri: 18,
  webScrapedAt: 13,
  contactPageUrl: 32,
  pipelineStatus: 15,
  contacts: 50,
  createdAt: 13,
  updatedAt: 13,
  scoredAt: 13,
};

// ── Center-aligned columns ──────────────────────────────────────
const CENTER_COLUMNS = new Set([
  'tier', 'rating', 'reviewCount',
  'compositeScore', 'businessQualityScore', 'exitReadinessScore',
  'isIntermediated', 'isExcluded', 'zipCode',
  'priceLevel', 'pipelineStatus', 'source',
]);

// ── Word-wrap columns (long text) ───────────────────────────────
const WRAP_COLUMNS = new Set([
  'scoringRationale', 'intermediationSignals', 'exclusionReason',
  'contacts', 'editorialSummary', 'reviewSummary',
]);

// ── URL columns (render as hyperlinks) ──────────────────────────
const URL_COLUMNS = new Set([
  'website', 'googleMapsUri', 'bestContactLinkedin',
  'contactPageUrl', 'bestContactInstagram', 'bestContactFacebook',
  'bestContactTwitter',
]);

// ── Data formatting helpers ─────────────────────────────────────

function formatPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (normalized.length !== 10) return raw;
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

function formatZip(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  return digits.padStart(5, '0');
}

function formatDate(raw: string): string {
  if (!raw) return '';
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return raw;
  }
}

function formatInt(raw: string): number | string {
  if (!raw) return '';
  const n = parseInt(raw, 10);
  return isNaN(n) ? raw : n;
}

function formatFloat(raw: string): number | string {
  if (!raw) return '';
  const n = parseFloat(raw);
  return isNaN(n) ? raw : Math.round(n * 10) / 10;
}

const FORMATTERS: Record<string, (v: string) => string | number> = {
  phone: formatPhone,
  bestContactPhone: formatPhone,
  zipCode: formatZip,
  createdAt: formatDate,
  updatedAt: formatDate,
  scoredAt: formatDate,
  webScrapedAt: formatDate,
  reviewCount: formatInt,
  tier: formatInt,
  compositeScore: formatInt,
  businessQualityScore: formatInt,
  exitReadinessScore: formatInt,
  rating: formatFloat,
};

// ── Style constants ─────────────────────────────────────────────

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A202C' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' },
};
const DATA_FONT: Partial<ExcelJS.Font> = { name: 'Arial', size: 10 };
const LINK_FONT: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, color: { argb: 'FF2B6CB0' }, underline: true };

const ZEBRA_FILL: ExcelJS.FillPattern = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' },
};
const ROW_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const TIER_FILLS: Record<number, ExcelJS.FillPattern> = {
  1: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6F6D5' } },
  2: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCBF' } },
  3: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7D7' } },
};

// ── Main export ─────────────────────────────────────────────────

export async function generateExcel(leads: any[], columns: string[]): Promise<Buffer> {
  const defs = columns
    .map((key) => columnDefMap.get(key))
    .filter((d): d is ExportColumnDef => d != null);

  if (defs.length === 0) {
    throw new Error('No valid columns selected');
  }

  // 1. Extract raw data
  const rawRows: Record<string, string>[] = leads.map((lead) => {
    const row: Record<string, string> = {};
    for (const d of defs) {
      row[d.key] = d.accessor(lead);
    }
    return row;
  });

  // 2. Drop columns that are 100% empty
  const liveDefs = defs.filter((d) =>
    rawRows.some((row) => row[d.key] != null && row[d.key] !== '')
  );

  // 3. Reorder: follow COLUMN_ORDER, then append any remaining
  const orderIndex = new Map(COLUMN_ORDER.map((k, i) => [k, i]));
  const ordered = [...liveDefs].sort((a, b) => {
    const iA = orderIndex.get(a.key) ?? 9999;
    const iB = orderIndex.get(b.key) ?? 9999;
    return iA - iB;
  });

  // 4. Format data
  const formattedRows = rawRows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const d of ordered) {
      const formatter = FORMATTERS[d.key];
      out[d.key] = formatter ? formatter(row[d.key]) : row[d.key];
    }
    return out;
  });

  // 5. Sort: tier asc (nulls last), rating desc
  formattedRows.sort((a, b) => {
    const tA = typeof a.tier === 'number' ? a.tier : Infinity;
    const tB = typeof b.tier === 'number' ? b.tier : Infinity;
    if (tA !== tB) return tA - tB;
    const rA = typeof a.rating === 'number' ? a.rating : -Infinity;
    const rB = typeof b.rating === 'number' ? b.rating : -Infinity;
    return rB - rA;
  });

  // 6. Build workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads');

  // Column definitions
  worksheet.columns = ordered.map((d) => ({
    header: d.header,
    key: d.key,
    width: COLUMN_WIDTHS[d.key] ?? Math.max(d.header.length + 4, 15),
  }));

  // ── Header row styling ──
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  headerRow.font = HEADER_FONT;
  headerRow.alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
  for (let c = 1; c <= ordered.length; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = HEADER_FILL;
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF4A5568' } },
    };
  }

  // Freeze header + auto-filter
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: formattedRows.length + 1, column: ordered.length },
  };

  // Pre-compute column indexes for special styling
  const tierColIdx = ordered.findIndex((d) => d.key === 'tier') + 1;
  const centerColIdxs = ordered.map((d, i) => CENTER_COLUMNS.has(d.key) ? i + 1 : -1).filter((i) => i > 0);
  const wrapColIdxs = ordered.map((d, i) => WRAP_COLUMNS.has(d.key) ? i + 1 : -1).filter((i) => i > 0);
  const urlColMap = new Map(ordered.map((d, i) => [i + 1, URL_COLUMNS.has(d.key)]));

  // ── Data rows ──
  for (let r = 0; r < formattedRows.length; r++) {
    const rowData = formattedRows[r];
    const excelRow = worksheet.addRow(rowData);
    const isEven = r % 2 === 0;

    excelRow.font = DATA_FONT;
    excelRow.border = ROW_BORDER;
    excelRow.alignment = { vertical: 'top' };

    // Zebra striping
    if (isEven) {
      for (let c = 1; c <= ordered.length; c++) {
        excelRow.getCell(c).fill = ZEBRA_FILL;
      }
    }

    // Center-align numeric/boolean columns
    for (const ci of centerColIdxs) {
      excelRow.getCell(ci).alignment = { horizontal: 'center', vertical: 'top' };
    }

    // Word-wrap long text columns
    for (const ci of wrapColIdxs) {
      excelRow.getCell(ci).alignment = { wrapText: true, vertical: 'top' };
    }

    // Hyperlink URL columns
    for (const [ci, isUrl] of urlColMap) {
      if (!isUrl) continue;
      const val = excelRow.getCell(ci).value;
      if (typeof val === 'string' && val.startsWith('http')) {
        excelRow.getCell(ci).value = { text: val, hyperlink: val };
        excelRow.getCell(ci).font = LINK_FONT;
      }
    }

    // Tier color-coding (overrides zebra)
    if (tierColIdx > 0) {
      const tierVal = rowData.tier;
      if (typeof tierVal === 'number' && TIER_FILLS[tierVal]) {
        const cell = excelRow.getCell(tierColIdx);
        cell.fill = TIER_FILLS[tierVal];
        cell.alignment = { horizontal: 'center', vertical: 'top' };
        cell.font = { ...DATA_FONT, bold: true };
      }
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
