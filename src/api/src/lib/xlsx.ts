/**
 * Excel (.xlsx) generation utility for lead exports.
 */

import ExcelJS from 'exceljs';
import { columnDefMap } from './export-columns';
import type { ExportColumnDef } from './export-columns';

/**
 * Generate an Excel workbook buffer from leads and selected column keys.
 */
export async function generateExcel(leads: any[], columns: string[]): Promise<Buffer> {
  const defs = columns
    .map((key) => columnDefMap.get(key))
    .filter((d): d is ExportColumnDef => d != null);

  if (defs.length === 0) {
    throw new Error('No valid columns selected');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads');

  // Header row
  worksheet.columns = defs.map((d) => ({
    header: d.header,
    key: d.key,
    width: Math.max(d.header.length + 4, 15),
  }));

  // Bold header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  // Data rows
  for (const lead of leads) {
    const row: Record<string, string> = {};
    for (const d of defs) {
      row[d.key] = d.accessor(lead);
    }
    worksheet.addRow(row);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
