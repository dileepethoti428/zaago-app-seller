import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface RefillItem {
  productName: string;
  currentStock: number;
  soldToday: number;
  requiredTomorrow: number;
  refillNeeded: number;
  unit: string;
}

interface ExportOptions {
  items: RefillItem[];
  sellerName: string;
}

const IST_TIMEZONE = 'Asia/Kolkata';

const getISTDateTime = (): { date: string; time: string; fullDateTime: string } => {
  const now = new Date();
  const istTime = toZonedTime(now, IST_TIMEZONE);
  return {
    date: format(istTime, 'yyyy-MM-dd'),
    time: format(istTime, 'hh:mm a'),
    fullDateTime: format(istTime, 'dd MMM yyyy, hh:mm a'),
  };
};

const getTomorrowDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const istTomorrow = toZonedTime(tomorrow, IST_TIMEZONE);
  return format(istTomorrow, 'yyyy-MM-dd');
};

const sanitizeFilename = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
};

export const exportRefillListAsCSV = ({ items, sellerName }: ExportOptions): void => {
  const { fullDateTime, date } = getISTDateTime();
  const tomorrowDate = getTomorrowDate();

  const csvData = items.map((item) => ({
    'Product Name': item.productName,
    'Current Stock': item.currentStock,
    'Sold Today': item.soldToday,
    'Required Tomorrow': item.requiredTomorrow,
    'Suggested Refill': item.refillNeeded,
    'Unit': item.unit,
    'Seller Name': sellerName,
    'For Date': tomorrowDate,
    'Generated (IST)': fullDateTime,
  }));

  const csv = Papa.unparse(csvData, {
    quotes: true,
    header: true,
  });

  // Add UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  
  const filename = `refill_list_${sanitizeFilename(sellerName)}_${date}.csv`;
  saveAs(blob, filename);
};

export const exportRefillListAsPDF = ({ items, sellerName }: ExportOptions): void => {
  const { date, fullDateTime } = getISTDateTime();
  const tomorrowDate = getTomorrowDate();

  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REFILL STOCK LIST – TOMORROW', 14, 20);

  // Seller and date info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Seller: ${sellerName}`, 14, 32);
  doc.text(`For Date: ${tomorrowDate}`, 14, 39);
  doc.text(`Generated: ${fullDateTime}`, 14, 46);

  // Table data
  const tableBody = items.map((item) => [
    item.productName,
    `${item.currentStock} ${item.unit}`,
    `${item.soldToday} ${item.unit}`,
    `${item.requiredTomorrow} ${item.unit}`,
    `${item.refillNeeded} ${item.unit}`,
  ]);

  // Calculate totals by unit
  const totalsByUnit: Record<string, number> = {};
  items.forEach((item) => {
    const unit = item.unit || 'units';
    totalsByUnit[unit] = (totalsByUnit[unit] || 0) + item.refillNeeded;
  });

  const totalRefillString = Object.entries(totalsByUnit)
    .map(([unit, qty]) => `${qty} ${unit}`)
    .join(', ');

  // Add totals row
  tableBody.push([
    `TOTAL (${items.length} items)`,
    '-',
    '-',
    '-',
    totalRefillString || '0 units',
  ]);

  // Generate table
  autoTable(doc, {
    startY: 55,
    head: [['Product', 'Current Stock', 'Sold Today', 'Required Tomorrow', 'Refill Needed']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [234, 88, 12], // Orange-600
      textColor: 255,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [254, 215, 170], // Orange-200
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 32, halign: 'center' },
    },
    didParseCell: (data) => {
      // Style the totals row
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fillColor = [254, 215, 170];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Generated automatically from subscription forecast', 14, finalY + 12);

  // Save
  const filename = `refill_list_${sanitizeFilename(sellerName)}_${date}.pdf`;
  doc.save(filename);
};
