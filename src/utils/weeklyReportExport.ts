import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ProductTrendSummary, DailyTrendData } from '@/hooks/useWeeklyRefillTrend';

const IST_TIMEZONE = 'Asia/Kolkata';

interface WeeklyExportOptions {
  products: ProductTrendSummary[];
  sellerName: string;
  dateRange: { start: string; end: string };
  totalRefillQuantity: number;
  top3Products: ProductTrendSummary[];
}

const getISTDateTime = (): string => {
  const nowIST = toZonedTime(new Date(), IST_TIMEZONE);
  return format(nowIST, 'd MMM yyyy, hh:mm a');
};

const sanitizeFilename = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
};

export const exportWeeklyReportAsCSV = ({ products, sellerName, dateRange }: WeeklyExportOptions): void => {
  // Create one row per product per day
  const rows: any[] = [];

  products.forEach(product => {
    product.dailyData.forEach(day => {
      rows.push({
        'Date': day.date,
        'Day': day.dayLabel,
        'Product Name': product.productName,
        'Sold Quantity': day.sold,
        'Forecast Quantity': day.forecast,
        'Refill Needed': day.refillNeeded,
        'Unit': product.unit,
        'Seller': sellerName,
        'Generated (IST)': getISTDateTime()
      });
    });
  });

  if (rows.length === 0) {
    console.warn('No data to export');
    return;
  }

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const filename = `weekly_refill_report_${sanitizeFilename(sellerName)}_${dateRange.start}_${dateRange.end}.csv`;
  saveAs(blob, filename);
};

export const exportWeeklyReportAsPDF = ({ 
  products, 
  sellerName, 
  dateRange,
  totalRefillQuantity,
  top3Products 
}: WeeklyExportOptions): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('WEEKLY REFILL TREND REPORT', pageWidth / 2, 20, { align: 'center' });

  // Subtitle & Seller Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Seller: ${sellerName}`, 14, 32);
  doc.text(`Week: ${dateRange.start} to ${dateRange.end}`, 14, 39);
  doc.text(`Generated: ${getISTDateTime()}`, 14, 46);

  // Summary Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Summary', 14, 58);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Refill Quantity (7 days): ${totalRefillQuantity} units`, 14, 66);
  doc.text(`Products Requiring Refill: ${products.length}`, 14, 73);

  if (top3Products.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Top 3 Refill-Heavy Products:', 14, 83);
    doc.setFont('helvetica', 'normal');
    top3Products.forEach((p, i) => {
      doc.text(`${i + 1}. ${p.productName} - ${p.totalRefillQuantity} ${p.unit}`, 20, 90 + i * 6);
    });
  }

  // Product Summary Table
  const tableStartY = top3Products.length > 0 ? 112 : 88;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Summary', 14, tableStartY);

  const tableData = products.map(p => [
    p.productName,
    p.daysRefillNeeded.toString(),
    p.totalRefillQuantity.toString(),
    p.avgDailyRefill.toFixed(1),
    p.unit
  ]);

  autoTable(doc, {
    startY: tableStartY + 5,
    head: [['Product', 'Days Refill Needed', 'Total Refill', 'Avg Daily', 'Unit']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [234, 88, 12], // Orange
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  });

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Generated automatically from sales & subscription forecast', pageWidth / 2, finalY + 15, { align: 'center' });

  const filename = `weekly_refill_report_${sanitizeFilename(sellerName)}_${dateRange.start}_${dateRange.end}.pdf`;
  doc.save(filename);
};
