/**
 * Excel (.xlsx) generation utility for lead exports.
 *
 * Applies cleanup/transform steps on raw lead data:
 * 1. Drop columns that are 100% empty
 * 2. Reorder columns into logical groups
 * 4. Format phone numbers, zip codes, dates, numbers
 * 5. Sort by tier asc (nulls last), rating desc
 * 6. Style the spreadsheet (header, tier colors, borders, widths)
 */

import ExcelJS from 'exceljs';
import { columnDefMap } from './export-columns';
import type { ExportColumnDef } from './export-columns';

// ── Column ordering (by key) ────────────────────────────────────
const COLUMN_ORDER: string[] = [
  // Company
  'name', 'businessType', 'tier',
  // Contact
  'bestContactFirstName', 'bestContactLastName', 'bestContactEmail', 'bestContactPhone', 'bestContactLinkedin',
  // Location
  'address', 'city', 'state', 'zipCode', 'phone', 'website',
  // Metrics & Meta
  'rating', 'reviewCount', 'googleMapsUri', 'createdAt',
];

// ── Column widths ───────────────────────────────────────────────
const COLUMN_WIDTHS: Record<string, number> = {
  name: 38,
  address: 42,
  bestContactEmail: 30,
  website: 32,
  bestContactLinkedin: 40,
  businessType: 22,
  city: 18,
  state: 16,
  bestContactFirstName: 18,
  bestContactLastName: 18,
  bestContactPhone: 18,
  phone: 18,
  googleMapsUri: 20,
  createdAt: 14,
  rating: 10,
  reviewCount: 14,
  tier: 8,
  zipCode: 10,
};

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
  reviewCount: formatInt,
  tier: formatInt,
  rating: formatFloat,
};

// ── Tier colors ─────────────────────────────────────────────────
const TIER_FILLS: Record<number, ExcelJS.FillPattern> = {
  1: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6F6D5' } },
  2: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCBF' } },
  3: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7D7' } },
};

// ── Style constants ─────────────────────────────────────────────
const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' },
};
const DATA_FONT: Partial<ExcelJS.Font> = { name: 'Arial', size: 10 };
const ROW_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
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

  // 3. Reorder: put ordered columns first, then any remaining in original order
  const orderedSet = new Set(COLUMN_ORDER);
  const liveKeys = new Set(liveDefs.map((d) => d.key));
  const ordered: ExportColumnDef[] = [];
  for (const key of COLUMN_ORDER) {
    if (liveKeys.has(key)) {
      ordered.push(liveDefs.find((d) => d.key === key)!);
    }
  }
  for (const d of liveDefs) {
    if (!orderedSet.has(d.key)) {
      ordered.push(d);
    }
  }

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

  // Set columns with renamed headers and widths
  worksheet.columns = ordered.map((d) => ({
    header: d.header,
    key: d.key,
    width: COLUMN_WIDTHS[d.key] ?? Math.max(d.header.length + 4, 15),
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = HEADER_FONT;
  headerRow.alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
  headerRow.height = 28;
  for (let c = 1; c <= ordered.length; c++) {
    headerRow.getCell(c).fill = HEADER_FILL;
  }

  // Freeze header
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: formattedRows.length + 1, column: ordered.length },
  };

  // Find tier column index (1-based)
  const tierColIdx = ordered.findIndex((d) => d.key === 'tier') + 1;

  // Data rows
  for (const rowData of formattedRows) {
    const excelRow = worksheet.addRow(rowData);
    excelRow.font = DATA_FONT;
    excelRow.border = ROW_BORDER;

    // Tier color-coding
    if (tierColIdx > 0) {
      const tierVal = rowData.tier;
      if (typeof tierVal === 'number' && TIER_FILLS[tierVal]) {
        const cell = excelRow.getCell(tierColIdx);
        cell.fill = TIER_FILLS[tierVal];
        cell.alignment = { horizontal: 'center' };
      }
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
