import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment, EmployeeSettings } from '../types';
import { getMonthName, isSameWeek, toISODate } from './dateUtils';

// Helper to generate common PDF structure
const generatePDF = (
  title: string,
  subtitle: string,
  rows: any[],
  total: number,
  settings: EmployeeSettings,
  fileName: string,
  extraStats?: { expectedTotal: number, weeksElapsed: number, paymentsCount: number, debt: number },
  globalDebt?: number
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

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Empleado', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  doc.text(`Nombre:`, 14, 58);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${settings.name}`, 40, 58);

  // --- Financial Balance Section (Total Report) ---
  if (extraStats) {
      const { expectedTotal, weeksElapsed, paymentsCount, debt } = extraStats;
      const isNegative = debt > 0; // Debt means they paid LESS than expected
      const missingWeeks = Math.max(0, weeksElapsed - paymentsCount);

      // Box background
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(100, 45, 96, 52, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('Balance General', 105, 53);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'normal');
      
      // Stats Logic
      doc.text('Semanas Transcurridas:', 105, 60);
      doc.text(`${weeksElapsed}`, 190, 60, { align: 'right' });

      doc.text('Pagos Realizados (Semanas cubiertas):', 105, 65);
      doc.setTextColor(0, 100, 0); // Dark Green
      doc.text(`${paymentsCount}`, 190, 65, { align: 'right' });
      doc.setTextColor(80);

      doc.text('Semanas Pendientes (Estimado):', 105, 70);
      if (missingWeeks > 0) doc.setTextColor(193, 39, 45); // Red if missing
      doc.text(`${missingWeeks}`, 190, 70, { align: 'right' });
      doc.setTextColor(80);

      // Financials
      doc.text(`Monto Ideal (${weeksElapsed} x $${settings.expectedAmount}):`, 105, 76);
      doc.text(`$${expectedTotal.toLocaleString()}`, 190, 76, { align: 'right' });
      
      doc.text('Monto Real Pagado:', 105, 81);
      doc.text(`$${total.toLocaleString()}`, 190, 81, { align: 'right' });

      // Line Separator
      doc.setDrawColor(200);
      doc.line(105, 84, 190, 84);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DEUDA ACUMULADA:', 105, 90);
      
      // Debt Color
      doc.setTextColor(isNegative ? 193 : 22, isNegative ? 39 : 163, isNegative ? 45 : 74); 
      doc.text(`$${debt.toLocaleString()}`, 190, 90, { align: 'right' });
      
      // Reset color
      doc.setTextColor(0);
  } else if (globalDebt !== undefined) {
      // --- Monthly Report Balance Section ---
      // Box background
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(100, 45, 96, 20, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('Estado de Cuenta Global (Al día de hoy)', 105, 53);

      doc.setFontSize(10);
      const isNegative = globalDebt > 0;
      doc.setTextColor(isNegative ? 193 : 22, isNegative ? 39 : 163, isNegative ? 45 : 74); 
      doc.text(`Deuda Acumulada: $${globalDebt.toLocaleString()}`, 190, 58, { align: 'right' });
      
      doc.setTextColor(0);
  }

  // --- Table ---
  const tableColumn = extraStats 
      ? ["Fecha Registro", "Nota / Semana Cubierta", "Ticket", "Monto"]
      : ["Fecha", "Detalle / Nota", "Estado", "Monto"];
  
  const tableStartY = extraStats ? 102 : 75;

  autoTable(doc, {
    startY: tableStartY,
    head: [tableColumn],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [193, 39, 45], // Brand Red
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle',
      minCellHeight: 15 // Ensure space for images
    },
    columnStyles: extraStats ? {
      0: { cellWidth: 35 }, // Fecha
      1: { cellWidth: 'auto' }, // Nota
      2: { cellWidth: 30, halign: 'center' }, // Ticket
      3: { cellWidth: 30, halign: 'right' } // Monto
    } : {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { cellWidth: 35, halign: 'right' }
    },
    didDrawCell: function(data) {
        // Embed Image Logic
        if (extraStats && data.column.index === 2 && data.cell.raw) {
             const imageStr = data.cell.raw as string;
             if (typeof imageStr === 'string' && imageStr.startsWith('data:image')) {
                 try {
                     const dim = data.cell.height - 4; // Margin
                     const x = data.cell.x + (data.cell.width - dim) / 2;
                     const y = data.cell.y + 2;
                     
                     doc.addImage(imageStr, 'JPEG', x, y, dim, dim);
                 } catch (e) {
                     // If image fails, text remains
                 }
             }
        }
    },
    didParseCell: function(data) {
       if (extraStats && data.column.index === 2 && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('data:image')) {
           data.cell.text = []; // Clear text
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
  settings: EmployeeSettings,
  currentDebt: number
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

  // Add Total Row
  if (tableRows.length > 0) {
      tableRows.push(['', 'TOTAL MES', '', `$${totalPaid.toLocaleString()}`]);
  } else {
      tableRows.push(['-', 'Sin movimientos este mes', '-', '$0.00']);
  }

  generatePDF(
    'Reporte Mensual',
    `Periodo: ${monthName} ${year}`,
    tableRows,
    totalPaid,
    settings,
    `Reporte_Mensual_${settings.name.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`,
    undefined,
    currentDebt
  );
};

export const generateTotalReport = (
  payments: Payment[],
  settings: EmployeeSettings
) => {
  // 1. Calculate time logic
  const startDate = new Date(settings.startDate + 'T00:00:00');
  
  // Determine Cutoff Date (EndDate or Today)
  let cutoffDate = new Date(); // Default to today
  if (settings.endDate) {
      cutoffDate = new Date(settings.endDate + 'T00:00:00');
  } else {
      cutoffDate = new Date();
      // Ensure we treat "today" as end of day for comparison or start of day? 
      // Comparison usually strictly date based strings, but for time diff let's be consistent.
      cutoffDate.setHours(0,0,0,0);
  }

  // Calculate total weeks elapsed since start date strictly within range
  // Using 7 day intervals
  const oneWeekMs = 1000 * 60 * 60 * 24 * 7;
  const timeDiff = cutoffDate.getTime() - startDate.getTime();
  const weeksElapsed = Math.floor(timeDiff / oneWeekMs);

  // 2. Process Actual Payments (No fillers)
  // Sort payments chronologically AND Filter by End Date
  const filteredPayments = payments
    .filter(p => {
        const pDate = new Date(p.date + 'T00:00:00');
        return pDate <= cutoffDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const tableRows: any[] = filteredPayments.map(p => [
      p.date,
      p.note || 'Pago de semana', // Usa la nota como referencia de la semana pagada
      p.receiptImage || '', 
      `$${p.amount.toLocaleString()}`
  ]);

  // 3. Financial Calculations
  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const paymentsCount = filteredPayments.length; // 1 payment = 1 week logic
  
  // Financial Debt Calculation
  // Expected amount is based on calendar time passed within the specific range
  const expectedTotal = weeksElapsed * settings.expectedAmount;
  const debt = expectedTotal - totalPaid;

  // Add Final Total Row
  tableRows.push([
      { content: 'TOTALES', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, 
      { content: `$${totalPaid.toLocaleString()}`, styles: { fontStyle: 'bold' } }
  ]);

  const rangeText = settings.endDate 
    ? `Rango: ${settings.startDate} al ${settings.endDate}`
    : `Historial Completo (Inicio: ${toISODate(startDate)})`;

  generatePDF(
    'Reporte de Sueldo y Deuda',
    rangeText,
    tableRows,
    totalPaid,
    settings,
    `Reporte_Total_Deuda_${settings.name.replace(/\s+/g, '_')}.pdf`,
    { expectedTotal, weeksElapsed, paymentsCount, debt }
  );
};