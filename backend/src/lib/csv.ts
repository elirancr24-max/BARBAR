// Shared CSV helpers — UTF-8 BOM + RFC 4180 escaping.
// Use for Hebrew-friendly Excel-compatible exports.

export const UTF8_BOM = '﻿';

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return UTF8_BOM + rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
}
