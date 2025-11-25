import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment, EmployeeSettings } from '../types';
import { getMonthName } from './dateUtils';

// Helper to generate common PDF structure
const generatePDF = (
  title: string,
  subtitle: string,
  rows: any[],
  total: number,
  settings: EmployeeSettings,
  fileName: string,
  extraStats?: { expectedTotal: number, weeksWorked: number, debt: number }
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

  // --- Financial Balance Section (Specific Request) ---
  if (extraStats) {
      const { expectedTotal, weeksWorked, debt } = extraStats;
      const isNegative = debt > 0; // Debt means they paid LESS than expected

      // Box background
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(100, 45, 96, 45, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('Resumen de Sueldos y Deuda', 105, 53);

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'normal');
      
      // Line 1: Weeks Worked (based on notes)
      doc.text('Semanas Trabajadas (Notas generadas):', 105, 60);
      doc.text(`${weeksWorked}`, 190, 60, { align: 'right' });

      // Line 2: Expected Amount
      doc.text(`Monto Esperado (${weeksWorked} x $${settings.expectedAmount}):`, 105, 66);
      doc.text(`$${expectedTotal.toLocaleString()}`, 190, 66, { align: 'right' });
      
      // Line 3: Actual Amount
      doc.text('Total Pagado Real:', 105, 72);
      doc.text(`$${total.toLocaleString()}`, 190, 72, { align: 'right' });

      // Line 4: Balance / Debt
      doc.setDrawColor(200);
      doc.line(105, 76, 190, 76);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DEUDA ACUMULADA:', 105, 82);
      
      // If Debt > 0, it's bad (Red). If Debt <= 0, it's good (Green or Black)
      doc.setTextColor(isNegative ? 193 : 22, isNegative ? 39 : 163, isNegative ? 45 : 74); 
      doc.text(`$${debt.toLocaleString()}`, 190, 82, { align: 'right' });
      
      // Reset color
      doc.setTextColor(0);
  }

  // --- Table ---
  // If extraStats exists, it's the Total Report
  const tableColumn = extraStats 
      ? ["Fecha", "Nota / Contenido", "Ticket (Imagen)", "Monto Pagado"]
      : ["Fecha", "Detalle / Nota", "Estado", "Monto"];
  
  const tableStartY = extraStats ? 95 : 75;

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
      0: { cellWidth: 30 }, // Fecha
      1: { cellWidth: 'auto' }, // Nota
      2: { cellWidth: 30, halign: 'center' }, // Ticket
      3: { cellWidth: 35, halign: 'right' } // Monto
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
             // Check if it looks like a base64 image string
             if (typeof imageStr === 'string' && imageStr.startsWith('data:image')) {
                 try {
                     // Clear the text "Ver Ticket" so we draw the image instead
                     // (Though autotable draws text before hook, we can draw over it or just ignore if we pass image as data)
                     // Actually, better to pass the base64 string as cell data, and here we draw the image.
                     
                     const dim = data.cell.height - 4; // Margin
                     const textPos = data.cell.getTextPos();
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
       // Hide the messy base64 text if it's the image column
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
    `Reporte_Mensual_${settings.name.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`
  );
};

export const generateTotalReport = (
  payments: Payment[],
  settings: EmployeeSettings
) => {
  // 1. Logic: Only consider days with generated notes/payments
  // Filter relevant payments (sort by date)
  const activePayments = payments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // 2. Calculations
  const weeksWorked = activePayments.length;
  const weeklySalary = settings.expectedAmount;
  
  const expectedTotal = weeksWorked * weeklySalary;
  const actualTotal = activePayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Debt calculation: What I should have earned vs What I actually got
  const debt = expectedTotal - actualTotal;

  // 3. Build Rows
  const tableRows: any[] = activePayments.map(p => {
      return [
          p.date,
          p.note || 'Sin detalles',
          p.receiptImage || 'Sin Ticket', // Pass image data here
          `$${p.amount.toLocaleString()}`
      ];
  });

  // Add Final Total Row
  tableRows.push([
      { content: 'TOTALES', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, 
      { content: `$${actualTotal.toLocaleString()}`, styles: { fontStyle: 'bold' } }
  ]);

  generatePDF(
    'Reporte de Sueldo y Deuda',
    `Basado en días laborados (notas generadas)`,
    tableRows,
    actualTotal,
    settings,
    `Reporte_Deuda_${settings.name.replace(/\s+/g, '_')}.pdf`,
    { expectedTotal, weeksWorked, debt }
  );
};