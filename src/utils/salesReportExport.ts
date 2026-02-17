import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { SalesReportItem } from '@/hooks/useSalesReport';

export const exportSalesReportPDF = (
  items: SalesReportItem[],
  dateRange: string,
  businessName?: string
) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(businessName || 'Sales Report', 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Period: ${dateRange}`, 14, 30);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, 36);

  // Summary
  const totalRevenue = items.reduce((sum, item) => sum + item.total, 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  doc.text(`Total Items Sold: ${totalQty}  |  Total Revenue: ₹${totalRevenue.toFixed(2)}`, 14, 44);

  // Table
  const tableData = items.map((item) => [
    format(parseISO(item.date), 'dd/MM/yy'),
    item.orderId.slice(0, 8),
    item.customerName.length > 15 ? item.customerName.slice(0, 15) + '...' : item.customerName,
    item.productName.length > 20 ? item.productName.slice(0, 20) + '...' : item.productName,
    item.quantity.toString(),
    `₹${item.unitPrice.toFixed(2)}`,
    `₹${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['Date', 'Order ID', 'Customer', 'Product', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 139, 34] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }

  doc.save(`sales-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
