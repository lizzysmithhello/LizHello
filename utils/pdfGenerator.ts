import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment, EmployeeSettings } from '../types';
import { getMonthName, toISODate, isSameWeek } from './dateUtils';

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
    doc.text('Historial de Pagos por Mes', margin, startY - 5);
    
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

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Ejecutivo', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  // Column 1
  doc.text(`Nombre:`, 14, 60);
  doc.text(`Fecha Inicio:`, 14, 66);
  if (extraStats) {
      doc.text(`Meses Trabajados:`, 14, 72);
  }

  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${settings.name}`, 50, 60);
  doc.text(`${settings.startDate}`, 50, 66);
  if (extraStats) {
      doc.text(`${extraStats.monthsWorked} meses`, 50, 72);
  }

  // Column 2 (Financials)
  doc.setTextColor(80);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Pagado Real:`, 110, 60);
  doc.text(`Monto Semanal:`, 110, 66);
  if (extraStats) {
      doc.text(`Total Esperado (Mes x 4):`, 110, 72);
  }

  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${total.toLocaleString()}`, 160, 60);
  doc.text(`$${settings.expectedAmount.toLocaleString()}`, 160, 66);
  if (extraStats) {
      doc.text(`$${extraStats.expectedTotal.toLocaleString()}`, 160, 72);
  }

  // --- Table ---
  const tableColumn = ["Fecha", "Semana / Notas", "Estado", "Monto"];
  
  if (rows.length === 0) {
    rows.push(['-', 'No hay registros', '-', '$0.00']);
  } else {
    // Add Total Row
    rows.push(['', 'TOTAL ACUMULADO', '', `$${total.toLocaleString()}`]);
  }

  autoTable(doc, {
    startY: 85,
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
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { cellWidth: 35, halign: 'right' }
    },
    didParseCell: function(data) {
        // Style "FALTA DE PAGO" rows
        if (data.row.raw[2] === 'FALTA DE PAGO') {
             data.cell.styles.textColor = [193, 39, 45];
             data.cell.styles.fontStyle = 'bold';
        }
        // Style Total Row
        if (rows.length > 0 && data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
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
          finalY = 20;
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
  
  // 2. Calculate Expected Total (Formula: Amount * 4 * Months)
  const expectedTotal = settings.expectedAmount * 4 * monthsWorked;
  
  let totalPaid = 0;

  // 3. Iterate week by week to build the timeline
  // Find first payment day
  let iterator = new Date(startDate);
  // Align iterator to the first expected payment day (e.g., first Friday after start date)
  while (iterator.getDay() !== settings.weeklyPaymentDay) {
      iterator.setDate(iterator.getDate() + 1);
  }

  // If the aligned start date is past today, we probably started recently or in future, handle grace
  const timeline: {date: string, type: 'PAYMENT' | 'MISSED', amount: number, note?: string}[] = [];
  
  // Map payments for quick access
  const paymentMap = new Map<string, Payment[]>(); // Key: YYYY-MM-DD
  payments.forEach(p => {
      // Accumulate for chart
      const monthKey = p.date.substring(0, 7); // YYYY-MM
      chartDataMap[monthKey] = (chartDataMap[monthKey] || 0) + p.amount;
      
      // Store in map
      if (!paymentMap.has(p.date)) paymentMap.set(p.date, []);
      paymentMap.get(p.date)?.push(p);
      
      totalPaid += p.amount;
  });

  // Build Chronological Timeline including Missed Weeks
  while (iterator <= today) {
      const weekCheckDate = new Date(iterator);
      let foundPaymentInWeek = false;
      
      // Check if any payment exists in this week (Mon-Sun flexible)
      payments.forEach(p => {
          const pDate = new Date(p.date + 'T00:00:00');
          if (isSameWeek(pDate, weekCheckDate)) {
              foundPaymentInWeek = true;
          }
      });

      // If NO payment in this week, mark as missed
      if (!foundPaymentInWeek) {
           timeline.push({
               date: toISODate(weekCheckDate),
               type: 'MISSED',
               amount: 0,
               note: 'Semana sin registro de pago'
           });
      } else {
          // If there IS a payment, we don't push it here yet because we want exact dates.
          // We will merge actual payments and missed dates next.
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

  // Generate Table Rows
  timeline.forEach(item => {
      if (item.type === 'PAYMENT') {
          tableRows.push([
              item.date,
              item.note || 'Pago recibido',
              'Pagado',
              `$${item.amount.toLocaleString()}`
          ]);
      } else {
          tableRows.push([
              item.date,
              item.note,
              'FALTA DE PAGO',
              '$0.00'
          ]);
      }
  });

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
