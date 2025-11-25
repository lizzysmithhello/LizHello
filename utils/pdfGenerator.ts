import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment, EmployeeSettings } from '../types';
import { getMonthName, toISODate, isSameWeek, getWeekNumber } from './dateUtils';

// Helper to draw a simple bar chart
const drawBarChart = (doc: jsPDF, data: { label: string, value: number }[], startY: number) => {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const chartWidth = pageWidth - (margin * 2);
    const chartHeight = 50;
    const maxVal = Math.max(...data.map(d => d.value), 1000); // Minimum scale to avoid div/0
    
    // Title
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Gráfica Mensual de Pagos Recibidos', margin, startY - 5);
    
    // Draw Axis
    doc.setDrawColor(200);
    doc.line(margin, startY + chartHeight, margin + chartWidth, startY + chartHeight); // X Axis
    
    if (data.length === 0) return;

    const barWidth = (chartWidth / data.length) * 0.6;
    const gap = (chartWidth / data.length) * 0.4;
    
    data.forEach((item, i) => {
        const x = margin + (i * (barWidth + gap)) + (gap / 2);
        const barHeight = (item.value / maxVal) * chartHeight;
        const y = startY + chartHeight - barHeight;
        
        // Bar
        doc.setFillColor(193, 39, 45); // Brand Red
        doc.rect(x, y, barWidth, barHeight, 'F');
        
        // Label (Month)
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        // Only show first 3 letters of month if too crowded
        const label = data.length > 12 ? item.label.substring(0, 3) : item.label;
        doc.text(label, x + (barWidth / 2), startY + chartHeight + 5, { align: 'center' });
        
        // Value on top
        if (item.value > 0) {
            doc.setFontSize(7);
            doc.setTextColor(0);
            doc.text(`$${Math.round(item.value)}`, x + (barWidth / 2), y - 2, { align: 'center' });
        }
    });
};

// Helper to generate common PDF structure
const generatePDF = (
  title: string,
  subtitle: string,
  rows: any[],
  total: number,
  settings: EmployeeSettings,
  fileName: string,
  extraStats?: { expectedTotal: number, monthsWorked: number },
  chartData?: { label: string, value: number }[]
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
  doc.text('Información General', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  // Column 1
  doc.text(`Nombre:`, 14, 58);
  doc.text(`Fecha Inicio:`, 14, 64);
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${settings.name}`, 40, 58);
  doc.text(`${settings.startDate}`, 40, 64);

  // --- Financial Balance Section (New) ---
  if (extraStats) {
      const balance = total - extraStats.expectedTotal;
      const isNegative = balance < 0;

      // Box background
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(100, 45, 96, 35, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('Balance Financiero Total', 105, 53);

      doc.setFontSize(9);
      doc.setTextColor(80);
      
      // Line 1: Expected
      doc.text('Debería ser (Meses trabajados):', 105, 60);
      doc.text(`$${extraStats.expectedTotal.toLocaleString()}`, 190, 60, { align: 'right' });
      
      // Line 2: Actual
      doc.text('Total Recibido (Suma real):', 105, 66);
      doc.text(`$${total.toLocaleString()}`, 190, 66, { align: 'right' });

      // Line 3: Balance
      doc.setDrawColor(200);
      doc.line(105, 70, 190, 70);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Diferencia / Balance:', 105, 76);
      
      doc.setTextColor(isNegative ? 220 : 0, isNegative ? 20 : 150, isNegative ? 60 : 0); // Red if negative, Greenish if positive
      doc.text(`$${balance.toLocaleString()}`, 190, 76, { align: 'right' });
      
      // Reset color
      doc.setTextColor(0);
  } else {
      // Fallback for monthly report simple summary
      doc.text(`Total Pagado:`, 140, 58);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${total.toLocaleString()}`, 170, 58);
  }

  // --- Table ---
  // Table Columns
  // If extraStats exists (Total Report), use detailed columns
  const tableColumn = extraStats 
      ? ["Fecha", "Semana", "Detalle / Nota", "Estado", "Monto"]
      : ["Fecha", "Detalle / Nota", "Estado", "Monto"];
  
  // Start position logic
  const tableStartY = extraStats ? 90 : 75;

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
      valign: 'middle'
    },
    columnStyles: extraStats ? {
      0: { cellWidth: 25 }, // Fecha
      1: { cellWidth: 20, halign: 'center' }, // Semana
      2: { cellWidth: 'auto' }, // Nota
      3: { cellWidth: 30, halign: 'center' }, // Estado
      4: { cellWidth: 30, halign: 'right' } // Monto
    } : {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { cellWidth: 35, halign: 'right' }
    },
    didParseCell: function(data) {
        // Headers grouping style
        if (data.row.raw.length === 1 && (data.row.raw[0] as any).colSpan) {
             data.cell.styles.fillColor = [241, 245, 249]; // Slate 100
             data.cell.styles.textColor = [71, 85, 105]; // Slate 600
             data.cell.styles.fontStyle = 'bold';
             data.cell.styles.halign = 'left';
        }
        // Style "FALTA DE PAGO" rows
        else if (data.row.raw[data.row.raw.length - 2] === 'FALTA DE PAGO') {
             data.cell.styles.textColor = [193, 39, 45];
             // data.cell.styles.fillColor = [254, 242, 242]; // Light Red bg
        }
        // Style "Pagado" state text
        else if (data.row.raw[data.row.raw.length - 2] === 'Pagado') {
             if (data.column.index === data.row.raw.length - 2) { // The 'Estado' column
                 data.cell.styles.textColor = [22, 163, 74]; // Green
                 data.cell.styles.fontStyle = 'bold';
             }
        }
    }
  });

  // --- Chart ---
  if (chartData && chartData.length > 0) {
      // @ts-ignore
      let finalY = doc.lastAutoTable.finalY || 150;
      
      // Check if we need a new page
      if (finalY > 220) {
          doc.addPage();
          finalY = 30;
      } else {
          finalY += 15;
      }
      
      drawBarChart(doc, chartData, finalY);
  }

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
  const tableRows: any[] = [];
  const chartDataMap: Record<string, number> = {};
  
  const startDate = new Date(settings.startDate + 'T00:00:00');
  const today = new Date();
  
  // 1. Calculate Months Worked
  const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
  const endMonth = today.getFullYear() * 12 + today.getMonth();
  const monthsWorked = Math.max(1, endMonth - startMonth + (today.getDate() >= startDate.getDate() ? 1 : 0));
  
  // 2. Calculate Expected Total (Formula: Amount * 4 * Months) as requested
  const expectedTotal = settings.expectedAmount * 4 * monthsWorked;
  
  let totalPaid = 0;

  // 3. Iterate week by week to build the timeline
  // Find first payment day
  let iterator = new Date(startDate);
  // Align iterator to the first expected payment day
  while (iterator.getDay() !== settings.weeklyPaymentDay) {
      iterator.setDate(iterator.getDate() + 1);
  }

  const timeline: {date: string, type: 'PAYMENT' | 'MISSED', amount: number, note?: string}[] = [];
  
  // Pre-process payments
  payments.forEach(p => {
      // Accumulate for chart
      const monthKey = p.date.substring(0, 7); // YYYY-MM
      chartDataMap[monthKey] = (chartDataMap[monthKey] || 0) + p.amount;
      
      totalPaid += p.amount;
  });

  // Build Chronological Timeline including Missed Weeks
  while (iterator <= today) {
      const weekCheckDate = new Date(iterator);
      let foundPaymentInWeek = false;
      
      // Check if any payment exists in this week
      payments.forEach(p => {
          const pDate = new Date(p.date + 'T00:00:00');
          if (isSameWeek(pDate, weekCheckDate)) {
              foundPaymentInWeek = true;
          }
      });

      if (!foundPaymentInWeek) {
           timeline.push({
               date: toISODate(weekCheckDate),
               type: 'MISSED',
               amount: 0,
               note: 'Semana sin registro'
           });
      }

      iterator.setDate(iterator.getDate() + 7);
  }

  // Add Actual Payments to timeline
  payments.forEach(p => {
      if (p.date >= settings.startDate) {
          timeline.push({
              date: p.date,
              type: 'PAYMENT',
              amount: p.amount,
              note: p.note
          });
      }
  });

  // Sort Timeline
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- Grouping Logic for Table ---
  let lastMonth = "";

  timeline.forEach(item => {
      const itemDate = new Date(item.date + 'T00:00:00');
      const monthLabel = getMonthName(itemDate).toUpperCase() + ' ' + itemDate.getFullYear();
      const weekNum = getWeekNumber(itemDate);

      // Add Section Header if month changes
      if (monthLabel !== lastMonth) {
          tableRows.push([{ content: monthLabel, colSpan: 5, styles: { halign: 'left' } }]);
          lastMonth = monthLabel;
      }

      // Add Data Row
      if (item.type === 'PAYMENT') {
          tableRows.push([
              item.date,
              `Sem ${weekNum}`,
              item.note || 'Pago recibido',
              'Pagado',
              `$${item.amount.toLocaleString()}`
          ]);
      } else {
          tableRows.push([
              item.date,
              `Sem ${weekNum}`,
              item.note,
              'FALTA DE PAGO',
              '$0.00'
          ]);
      }
  });

  // Add Final Total Row
  tableRows.push([{ content: 'TOTAL ACUMULADO', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `$${totalPaid.toLocaleString()}`, styles: { fontStyle: 'bold' } }]);

  // Prepare Chart Data (Sorted Keys)
  const chartData = Object.keys(chartDataMap).sort().map(key => {
      const [y, m] = key.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m)-1, 1);
      const label = new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' }).format(dateObj);
      return {
          label: label,
          value: chartDataMap[key]
      };
  });

  generatePDF(
    'Reporte Total Detallado',
    `Periodo: ${settings.startDate} al ${toISODate(today)}`,
    tableRows,
    totalPaid,
    settings,
    `Reporte_Total_${settings.name.replace(/\s+/g, '_')}.pdf`,
    { expectedTotal, monthsWorked },
    chartData
  );
};
