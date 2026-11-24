/**
 * exportUtils.ts
 * Zia-Billing — Universal Export Utility
 * Supports: CSV, Excel (XLSX multi-sheet), PDF (via jsPDF + autotable)
 * Works in both Electron desktop context and browser.
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface SheetData {
  /** Tab name in the Excel workbook */
  name: string;
  /** Array of plain objects — keys become column headers */
  data: Record<string, unknown>[];
}

export interface PdfTableConfig {
  /** Document title printed at the top */
  title: string;
  /** Optional subtitle (e.g. company name, date range) */
  subtitle?: string;
  /** Column headers in display order */
  columns: string[];
  /** Row data arrays — must align with columns */
  rows: (string | number)[][];
  /** Optional company info footer */
  companyInfo?: {
    name: string;
    gstin?: string;
    address?: string;
  };
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

/**
 * Convert an array of objects to a CSV string and trigger a browser/Electron download.
 * @param filename  File name without extension (e.g. "sales-register")
 * @param data      Array of plain objects
 */
export function exportToCSV(filename: string, data: Record<string, unknown>[]): void {
  if (!data || data.length === 0) {
    alert('No data to export.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h] ?? '';
      // Escape values that contain commas, quotes, or newlines
      const str = String(val).replace(/"/g, '""');
      return /[,"\n\r]/.test(str) ? `"${str}"` : str;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8 compat
  triggerDownload(blob, `${filename}.csv`);
}

// ─── Excel Export ────────────────────────────────────────────────────────────

/**
 * Create a multi-sheet Excel workbook and trigger download.
 * @param filename  File name without extension (e.g. "zia-report-2025")
 * @param sheets    Array of { name, data } — each becomes a worksheet tab
 */
export function exportToExcel(filename: string, sheets: SheetData[]): void {
  if (!sheets || sheets.length === 0) {
    alert('No data to export.');
    return;
  }

  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    if (!sheet.data || sheet.data.length === 0) continue;
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);

    // Auto-size columns (approx based on max string length)
    const cols: { wch: number }[] = Object.keys(sheet.data[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...sheet.data.map((row) => String(row[key] ?? '').length)
      ) + 2,
    }));
    worksheet['!cols'] = cols;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `${filename}.xlsx`);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

/**
 * Generate a professional PDF report with header, table, and footer.
 * @param filename   File name without extension
 * @param config     PdfTableConfig with title, columns, and rows
 */
export function exportToPDF(filename: string, config: PdfTableConfig): void {
  if (!config.rows || config.rows.length === 0) {
    alert('No data to export.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Header ──
  doc.setFillColor(30, 64, 175); // Indigo-800
  doc.rect(0, 0, 297, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ZIA BILLING', 10, 10);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(config.title, 10, 17);

  if (config.subtitle) {
    doc.setFontSize(9);
    doc.text(config.subtitle, 297 - 10, 17, { align: 'right' });
  }

  // ── Company Info block ──
  let startY = 28;
  if (config.companyInfo) {
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(config.companyInfo.name, 10, startY);
    doc.setFont('helvetica', 'normal');
    if (config.companyInfo.gstin) {
      doc.text(`GSTIN: ${config.companyInfo.gstin}`, 10, startY + 4);
    }
    if (config.companyInfo.address) {
      doc.text(config.companyInfo.address, 10, startY + 8);
    }
    startY += 14;
  }

  // ── Timestamp ──
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    297 - 10,
    startY - 2,
    { align: 'right' }
  );

  // ── Table ──
  autoTable(doc, {
    startY,
    head: [config.columns],
    body: config.rows,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [240, 244, 255],
    },
    tableWidth: 'auto',
    margin: { left: 10, right: 10 },
  });

  // ── Page numbers ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 297 / 2, 205, { align: 'center' });
    doc.text('Zia-Billing — Confidential', 10, 205);
  }

  doc.save(`${filename}.pdf`);
}

// ─── Helper: Trigger browser download ────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Format a date string or Date to Indian locale string for export rows */
export function fmtDate(d: string | Date | undefined | null): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('en-IN');
  } catch {
    return String(d);
  }
}

/** Format a number as INR currency string for export rows */
export function fmtCurrency(n: number | undefined | null): string {
  if (n == null) return '₹0.00';
  return `₹${Number(n).toFixed(2)}`;
}

/** Safely convert any value to a display string */
export function fmtVal(v: unknown): string {
  if (v == null) return '-';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}
