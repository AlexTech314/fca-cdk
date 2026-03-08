/**
 * CSV generation utility for lead exports.
 */

import { columnDefMap, exportColumnKeys } from './export-columns';
import type { ExportColumnDef } from './export-columns';

export { exportColumnKeys };

/** Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines */
function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate a CSV string from leads and selected column keys.
 */
export function generateCsv(leads: any[], columns: string[]): string {
  const defs = columns
    .map((key) => columnDefMap.get(key))
    .filter((d): d is ExportColumnDef => d != null);

  if (defs.length === 0) {
    throw new Error('No valid columns selected');
  }

  const header = defs.map((d) => escapeCsvValue(d.header)).join(',');
  const rows = leads.map((lead) =>
    defs.map((d) => escapeCsvValue(d.accessor(lead))).join(',')
  );

  return [header, ...rows].join('\n');
}
