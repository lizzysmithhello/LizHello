import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment, EmployeeSettings } from '../types';
import { getMonthName, toISODate } from './dateUtils';

// Helper to generate common PDF structure
const generatePDF = (
  title: string,
  subtitle: string,
  rows: any[],
  total: number,
  settings: EmployeeSettings,
  fileName: string
) => {
  const doc = new jsPDF();
  
  // Brand Color Strip
  doc.setFillColor(193, 39, 45); // #C1272D
  doc.rect(0, 0, 210, 5, 'F');

  // Title
  doc.setFontSize(22);
  doc.setTextColor(193, 39, 45);
  doc.setFont('helvetica', 'bold');
  doc.text('CENTRO MEAVE 6', 14, 25);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 32);

  // Date info
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, 140, 25);
  doc.text(subtitle, 140, 32);

  // --- Employee Info Section ---
  doc.setDrawColor(200);
  doc.line(14, 40, 196, 40);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles del Empleado', 14, 50);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Nombre:`, 14, 60);
  doc.text(`Monto Esperado Semanal:`, 14, 68);
  doc.text(`Total Pagado (Periodo):`, 14, 76);

  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${settings.name}`, 65, 60);
  doc.text(`$${settings.expectedAmount.toLocaleString()}`, 65, 68);
  doc.text(`$${total.toLocaleString()}`, 65, 76);

  // --- Table ---
  const tableColumn = ["Fecha", "Concepto / Notas", "Estado", "Monto"];
  
  if (rows.length === 0) {
    rows.push(['-', 'No hay pagos registrados', '-', '$0.00']);
  } else {
    // Add Total Row
    rows.push(['', 'TOTAL PERIODO', '', `$${total.toLocaleString()}`]);
  }

  autoTable(doc, {
    startY: 90,
    head: [tableColumn],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [193, 39, 45], // Brand Red
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30 },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: function(data) {
        // Style the last row (Total)
        if (rows.length > 0 && data.row.index === rows.length - 1) { // Fixed index check logic
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [245, 245, 245];
        }
    }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Centro Meave 6 - Sistema de Gestión de Pagos', 14, 285);
    doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
  }

  doc.save(fileName);
};

export const generateMonthlyReport = (
  currentDate: Date,
  payments: Payment[],
  settings: EmployeeSettings
) => {
  const monthName = getMonthName(currentDate);
  const year = currentDate.getFullYear();
  const currentMonthStr = currentDate.toISOString().slice(0, 7); // YYYY-MM
  
  // Filter payments for the current month
  const monthlyPayments = payments
    .filter(p => p.date.startsWith(currentMonthStr))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalPaid = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

  const tableRows = monthlyPayments.map(payment => [
    payment.date,
    payment.note || 'Sin nota',
    'Pagado',
    `$${payment.amount.toLocaleString()}`
  ]);

  generatePDF(
    'Reporte Mensual',
    `Periodo: ${monthName} ${year}`,
    tableRows,
    totalPaid,
    settings,
    `Reporte_Mensual_${settings.name.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`
  );
};

export const generateTotalReport = (
  payments: Payment[],
  settings: EmployeeSettings
) => {
  // Filter payments from start date onwards
  const relevantPayments = payments
    .filter(p => p.date >= settings.startDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalPaid = relevantPayments.reduce((sum, p) => sum + p.amount, 0);

  const tableRows = relevantPayments.map(payment => [
    payment.date,
    payment.note || 'Sin nota',
    'Pagado',
    `$${payment.amount.toLocaleString()}`
  ]);

  generatePDF(
    'Reporte Histórico Total',
    `Desde: ${settings.startDate}`,
    tableRows,
    totalPaid,
    settings,
    `Reporte_Total_${settings.name.replace(/\s+/g, '_')}.pdf`
  );
};