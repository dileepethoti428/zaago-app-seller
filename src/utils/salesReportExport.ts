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
  doc.text(`Total Items Sold: ${totalQty}  |  Total Revenue: Rs.${totalRevenue.toFixed(2)}`, 14, 44);

  // Product Summary Table
  const productSummary: Record<string, { qty: number; revenue: number }> = {};
  items.forEach((item) => {
    const name = item.productName || 'Unknown';
    if (!productSummary[name]) productSummary[name] = { qty: 0, revenue: 0 };
    productSummary[name].qty += item.quantity;
    productSummary[name].revenue += item.total;
  });

  const summaryData = Object.entries(productSummary)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([name, data]) => [
      name.length > 25 ? name.slice(0, 25) + '...' : name,
      data.qty.toString(),
      `Rs.${data.revenue.toFixed(2)}`,
    ]);

  autoTable(doc, {
    startY: 50,
    head: [['Product', 'Qty Sold', 'Revenue']],
    body: summaryData,
    styles: { fontSize: 9 },
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
