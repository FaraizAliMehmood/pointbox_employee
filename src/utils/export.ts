import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) => headers.map((header) => `"${row[header] || ''}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export const exportToXLSX = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (data: any[], filename: string, columns: string[]) => {
  if (data.length === 0) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const startY = 20;
  let y = startY;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(139, 92, 246);
  doc.text(filename.toUpperCase(), margin, y);
  y += 10;

  // Table header
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const colWidth = (pageWidth - 2 * margin) / columns.length;
  let x = margin;

  columns.forEach((col) => {
    doc.setFillColor(139, 92, 246);
    doc.rect(x, y, colWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(col, x + 2, y + 6);
    x += colWidth;
  });

  y += 8;
  doc.setTextColor(0, 0, 0);

  // Table rows
  data.forEach((row) => {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = startY;
    }
    x = margin;
    columns.forEach((col) => {
      const text = String(row[col] || '');
      doc.text(text.substring(0, 20), x + 2, y + 6);
      x += colWidth;
    });
    y += 8;
  });

  doc.save(`${filename}.pdf`);
};

