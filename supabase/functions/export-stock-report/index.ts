import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefillItem {
  productName: string;
  currentStock: number;
  soldToday: number;
  requiredTomorrow: number;
  refillNeeded: number;
  unit: string;
}

interface WeeklyProduct {
  productId: string;
  productName: string;
  unit: string;
  dailyData: Array<{
    date: string;
    dayLabel: string;
    sold: number;
    forecast: number;
    refillNeeded: number;
  }>;
  totalRefillQuantity: number;
  daysRefillNeeded: number;
  avgDailyRefill: number;
}

interface DeliveryReportItem {
  date: string;
  time: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  orderTotal: number;
  paymentStatus: string;
  deliveryAddress: string;
  city: string;
  specialInstructions: string;
}

interface ProductSummary {
  name: string;
  quantity: number;
  orders: number;
}

const getISTDateTime = (): { date: string; fullDateTime: string; tomorrowDate: string } => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const tomorrow = new Date(istTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatDateTime = (d: Date) => {
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hour12}:${minutes} ${ampm}`;
  };
  
  return {
    date: formatDate(istTime),
    fullDateTime: formatDateTime(istTime),
    tomorrowDate: formatDate(tomorrow),
  };
};

const sanitizeFilename = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
};

// CSV Generation Functions
const generateRefillListCSV = (items: RefillItem[], sellerName: string): string => {
  const { fullDateTime, tomorrowDate } = getISTDateTime();
  
  const headers = ['Product Name', 'Current Stock', 'Sold Today', 'Required Tomorrow', 'Suggested Refill', 'Unit', 'Seller Name', 'For Date', 'Generated (IST)'];
  const rows = items.map(item => [
    `"${item.productName}"`,
    item.currentStock,
    item.soldToday,
    item.requiredTomorrow,
    item.refillNeeded,
    `"${item.unit}"`,
    `"${sellerName}"`,
    tomorrowDate,
    `"${fullDateTime}"`
  ].join(','));
  
  return '\ufeff' + [headers.join(','), ...rows].join('\n');
};

const generateWeeklyReportCSV = (products: WeeklyProduct[], sellerName: string, dateRange: { start: string; end: string }): string => {
  const { fullDateTime } = getISTDateTime();
  
  const headers = ['Date', 'Day', 'Product Name', 'Sold Quantity', 'Forecast Quantity', 'Refill Needed', 'Unit', 'Seller', 'Generated (IST)'];
  const rows: string[] = [];
  
  products.forEach(product => {
    product.dailyData.forEach(day => {
      rows.push([
        day.date,
        `"${day.dayLabel}"`,
        `"${product.productName}"`,
        day.sold,
        day.forecast,
        day.refillNeeded,
        `"${product.unit}"`,
        `"${sellerName}"`,
        `"${fullDateTime}"`
      ].join(','));
    });
  });
  
  return '\ufeff' + [headers.join(','), ...rows].join('\n');
};

const generateDeliveryReportCSV = (
  orders: DeliveryReportItem[], 
  productSummary: ProductSummary[], 
  selectedDate: string
): string => {
  const headers = ['Date', 'Time', 'Order ID', 'Customer Name', 'Customer Phone', 'Product Name', 'Quantity', 'Unit Price (₹)', 'Item Total (₹)', 'Order Total (₹)', 'Payment Status', 'Delivery Address', 'City', 'Special Instructions'];
  
  const orderRows = orders.map(item => [
    item.date,
    item.time,
    item.orderId,
    `"${item.customerName}"`,
    `"${item.customerPhone}"`,
    `"${item.productName}"`,
    item.quantity,
    item.unitPrice,
    item.itemTotal,
    item.orderTotal,
    `"${item.paymentStatus}"`,
    `"${item.deliveryAddress}"`,
    `"${item.city}"`,
    `"${item.specialInstructions}"`
  ].join(','));
  
  const separator = ['', '', '--- PRODUCT SUMMARY ---', '', '', '', '', '', '', '', '', '', '', ''].join(',');
  
  const summaryRows = productSummary.map(product => [
    selectedDate,
    '',
    'SUMMARY',
    '',
    '',
    `"${product.name}"`,
    product.quantity,
    '',
    '',
    '',
    '',
    `"${product.orders} orders delivered"`,
    '',
    `"Restock Level: ${product.quantity > 50 ? 'High' : product.quantity > 20 ? 'Medium' : 'Low'}"`
  ].join(','));
  
  return '\ufeff' + [headers.join(','), ...orderRows, separator, ...summaryRows].join('\n');
};

// PDF Generation Functions using pdf-lib
const generateRefillListPDF = async (items: RefillItem[], sellerName: string): Promise<Uint8Array> => {
  const { fullDateTime, tomorrowDate } = getISTDateTime();
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  let y = height - 50;
  const margin = 40;
  const contentWidth = width - (margin * 2);
  
  // Colors
  const orange = rgb(0.82, 0.41, 0.12); // RGB: 210, 105, 30
  const lightOrange = rgb(1, 0.9, 0.78); // Light orange for total row
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const white = rgb(1, 1, 1);
  
  // Title
  page.drawText('REFILL STOCK LIST – TOMORROW', {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;
  
  // Header info
  page.drawText(`Seller: ${sellerName}`, { x: margin, y, size: 11, font, color: gray });
  y -= 18;
  page.drawText(`For Date: ${tomorrowDate}`, { x: margin, y, size: 11, font, color: gray });
  y -= 18;
  page.drawText(`Generated: ${fullDateTime} IST`, { x: margin, y, size: 11, font, color: gray });
  y -= 35;
  
  // Table configuration
  const columns = [
    { header: 'Product', width: 150 },
    { header: 'Current Stock', width: 85 },
    { header: 'Sold Today', width: 75 },
    { header: 'Required Tomorrow', width: 110 },
    { header: 'Refill Needed', width: 90 },
  ];
  
  const rowHeight = 28;
  const headerHeight = 32;
  let x = margin;
  
  // Draw table header background
  page.drawRectangle({
    x: margin,
    y: y - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: orange,
  });
  
  // Draw header text
  x = margin + 8;
  columns.forEach(col => {
    page.drawText(col.header, {
      x,
      y: y - 20,
      size: 10,
      font: fontBold,
      color: white,
    });
    x += col.width;
  });
  y -= headerHeight;
  
  // Draw table rows
  let totalRefill = 0;
  items.forEach((item, index) => {
    const rowY = y - rowHeight;
    
    // Alternating row background
    if (index % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: rowY,
        width: contentWidth,
        height: rowHeight,
        color: lightGray,
      });
    }
    
    // Row data
    x = margin + 8;
    const rowData = [
      item.productName.substring(0, 25),
      `${item.currentStock} ${item.unit}`,
      `${item.soldToday} ${item.unit}`,
      `${item.requiredTomorrow} ${item.unit}`,
      `${item.refillNeeded} ${item.unit}`,
    ];
    
    rowData.forEach((text, colIndex) => {
      page.drawText(String(text), {
        x,
        y: rowY + 10,
        size: 9,
        font: colIndex === 4 ? fontBold : font,
        color: colIndex === 4 ? orange : rgb(0, 0, 0),
      });
      x += columns[colIndex].width;
    });
    
    totalRefill += item.refillNeeded;
    y -= rowHeight;
  });
  
  // Total row
  page.drawRectangle({
    x: margin,
    y: y - rowHeight,
    width: contentWidth,
    height: rowHeight,
    color: lightOrange,
  });
  
  page.drawText('TOTAL', {
    x: margin + 8,
    y: y - rowHeight + 10,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(`${totalRefill} units`, {
    x: margin + columns[0].width + columns[1].width + columns[2].width + columns[3].width + 8,
    y: y - rowHeight + 10,
    size: 10,
    font: fontBold,
    color: orange,
  });
  y -= rowHeight + 20;
  
  // Footer
  page.drawText('Generated automatically from subscription forecast', {
    x: margin,
    y: 30,
    size: 9,
    font,
    color: orange,
  });
  
  return pdfDoc.save();
};

const generateWeeklyReportPDF = async (products: WeeklyProduct[], sellerName: string, dateRange: { start: string; end: string }): Promise<Uint8Array> => {
  const { fullDateTime } = getISTDateTime();
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  let y = height - 50;
  const margin = 40;
  const contentWidth = width - (margin * 2);
  
  // Colors
  const orange = rgb(0.82, 0.41, 0.12);
  const lightOrange = rgb(1, 0.9, 0.78);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const white = rgb(1, 1, 1);
  
  // Title
  page.drawText('WEEKLY REFILL TREND REPORT', {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;
  
  // Header info
  page.drawText(`Seller: ${sellerName}`, { x: margin, y, size: 11, font, color: gray });
  y -= 18;
  page.drawText(`Week: ${dateRange.start} to ${dateRange.end}`, { x: margin, y, size: 11, font, color: gray });
  y -= 18;
  page.drawText(`Generated: ${fullDateTime} IST`, { x: margin, y, size: 11, font, color: gray });
  y -= 35;
  
  // Summary section
  const totalRefill = products.reduce((sum, p) => sum + p.totalRefillQuantity, 0);
  const productsNeedingRefill = products.filter(p => p.totalRefillQuantity > 0).length;
  
  page.drawText('Summary', { x: margin, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
  y -= 22;
  page.drawText(`Total Refill Quantity (7 days): ${totalRefill} units`, { x: margin, y, size: 11, font, color: gray });
  y -= 18;
  page.drawText(`Products Requiring Refill: ${productsNeedingRefill}`, { x: margin, y, size: 11, font, color: gray });
  y -= 30;
  
  // Top 3 Products
  const sortedProducts = [...products].sort((a, b) => b.totalRefillQuantity - a.totalRefillQuantity);
  const top3 = sortedProducts.slice(0, 3);
  
  if (top3.length > 0) {
    page.drawText('Top 3 Refill-Heavy Products', { x: margin, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    y -= 20;
    
    top3.forEach((product, index) => {
      page.drawText(`${index + 1}. ${product.productName} – ${product.totalRefillQuantity} ${product.unit}`, {
        x: margin + 10,
        y,
        size: 10,
        font,
        color: gray,
      });
      y -= 16;
    });
    y -= 20;
  }
  
  // Product Summary Table
  page.drawText('Product Summary', { x: margin, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
  y -= 25;
  
  const columns = [
    { header: 'Product', width: 180 },
    { header: 'Days Refill Needed', width: 100 },
    { header: 'Total Refill', width: 80 },
    { header: 'Avg Daily', width: 70 },
    { header: 'Unit', width: 60 },
  ];
  
  const rowHeight = 26;
  const headerHeight = 30;
  
  // Draw table header background
  page.drawRectangle({
    x: margin,
    y: y - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: orange,
  });
  
  // Draw header text
  let x = margin + 8;
  columns.forEach(col => {
    page.drawText(col.header, {
      x,
      y: y - 19,
      size: 9,
      font: fontBold,
      color: white,
    });
    x += col.width;
  });
  y -= headerHeight;
  
  // Draw table rows (limit to fit on page)
  const maxRows = Math.min(sortedProducts.length, 15);
  sortedProducts.slice(0, maxRows).forEach((product, index) => {
    const rowY = y - rowHeight;
    
    if (index % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: rowY,
        width: contentWidth,
        height: rowHeight,
        color: lightGray,
      });
    }
    
    x = margin + 8;
    const rowData = [
      product.productName.substring(0, 30),
      String(product.daysRefillNeeded),
      String(product.totalRefillQuantity),
      product.avgDailyRefill.toFixed(1),
      product.unit,
    ];
    
    rowData.forEach((text, colIndex) => {
      page.drawText(text, {
        x,
        y: rowY + 9,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
      x += columns[colIndex].width;
    });
    
    y -= rowHeight;
  });
  
  // Footer
  page.drawText('Generated automatically from sales & subscription forecast', {
    x: margin,
    y: 30,
    size: 9,
    font,
    color: orange,
  });
  
  return pdfDoc.save();
};

const generateDeliveryReportPDF = async (
  orders: DeliveryReportItem[], 
  productSummary: ProductSummary[], 
  selectedDate: string
): Promise<Uint8Array> => {
  const { fullDateTime } = getISTDateTime();
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  let y = height - 50;
  const margin = 40;
  const contentWidth = width - (margin * 2);
  
  const orange = rgb(0.82, 0.41, 0.12);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const white = rgb(1, 1, 1);
  
  // Title
  page.drawText('DELIVERY REPORT', {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;
  
  // Header info
  page.drawText(`Date: ${selectedDate}`, { x: margin, y, size: 11, font, color: gray });
  y -= 18;
  page.drawText(`Generated: ${fullDateTime} IST`, { x: margin, y, size: 11, font, color: gray });
  y -= 35;
  
  // Summary
  const totalOrders = new Set(orders.map(o => o.orderId)).size;
  const totalAmount = orders.reduce((sum, o) => sum + o.itemTotal, 0);
  
  page.drawText('Summary', { x: margin, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
  y -= 22;
  page.drawText(`Total Orders: ${totalOrders}`, { x: margin, y, size: 11, font, color: gray });
  y -= 18;
  page.drawText(`Total Amount: ₹${totalAmount.toFixed(2)}`, { x: margin, y, size: 11, font, color: gray });
  y -= 30;
  
  // Product Summary Table
  if (productSummary.length > 0) {
    page.drawText('Product Summary', { x: margin, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    y -= 25;
    
    const columns = [
      { header: 'Product', width: 250 },
      { header: 'Quantity', width: 100 },
      { header: 'Orders', width: 100 },
    ];
    
    const headerHeight = 28;
    
    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: orange,
    });
    
    let x = margin + 8;
    columns.forEach(col => {
      page.drawText(col.header, {
        x,
        y: y - 18,
        size: 9,
        font: fontBold,
        color: white,
      });
      x += col.width;
    });
    y -= headerHeight;
    
    const rowHeight = 24;
    productSummary.forEach((product, index) => {
      const rowY = y - rowHeight;
      
      if (index % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: rowY,
          width: contentWidth,
          height: rowHeight,
          color: lightGray,
        });
      }
      
      x = margin + 8;
      page.drawText(product.name.substring(0, 40), { x, y: rowY + 8, size: 9, font, color: rgb(0, 0, 0) });
      x += columns[0].width;
      page.drawText(String(product.quantity), { x, y: rowY + 8, size: 9, font, color: rgb(0, 0, 0) });
      x += columns[1].width;
      page.drawText(String(product.orders), { x, y: rowY + 8, size: 9, font, color: rgb(0, 0, 0) });
      
      y -= rowHeight;
    });
  }
  
  // Footer
  page.drawText('Generated automatically', {
    x: margin,
    y: 30,
    size: 9,
    font,
    color: orange,
  });
  
  return pdfDoc.save();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, format, sellerId, data, sellerName, dateRange, selectedDate, productSummary } = await req.json();
    
    console.log('Export request:', { type, format, sellerId, sellerName });
    
    if (!type || !format || !sellerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: type, format, sellerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = 'https://amhpjsmubciahslghobw.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let fileContent: string | Uint8Array;
    let filename: string;
    let contentType: string;
    const { date } = getISTDateTime();
    const safeSellerName = sanitizeFilename(sellerName || 'seller');

    if (format === 'csv') {
      contentType = 'text/csv;charset=utf-8';
      
      if (type === 'refill-list') {
        fileContent = generateRefillListCSV(data as RefillItem[], sellerName);
        filename = `refill_list_${safeSellerName}_${date}.csv`;
      } else if (type === 'weekly-report') {
        fileContent = generateWeeklyReportCSV(data as WeeklyProduct[], sellerName, dateRange);
        filename = `weekly_refill_report_${safeSellerName}_${dateRange?.start || date}_${dateRange?.end || date}.csv`;
      } else if (type === 'delivery-report') {
        fileContent = generateDeliveryReportCSV(data as DeliveryReportItem[], productSummary || [], selectedDate || date);
        filename = `zaago-delivery-report-${selectedDate || date}.csv`;
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid report type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (format === 'pdf') {
      contentType = 'application/pdf';
      
      if (type === 'refill-list') {
        fileContent = await generateRefillListPDF(data as RefillItem[], sellerName);
        filename = `refill_list_${safeSellerName}_${date}.pdf`;
      } else if (type === 'weekly-report') {
        fileContent = await generateWeeklyReportPDF(data as WeeklyProduct[], sellerName, dateRange);
        filename = `weekly_refill_report_${safeSellerName}_${dateRange?.start || date}_${dateRange?.end || date}.pdf`;
      } else if (type === 'delivery-report') {
        fileContent = await generateDeliveryReportPDF(data as DeliveryReportItem[], productSummary || [], selectedDate || date);
        filename = `zaago-delivery-report-${selectedDate || date}.pdf`;
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid report type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Use csv or pdf.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timestamp = Date.now();
    const fileExtension = format === 'csv' ? 'csv' : 'pdf';
    const filePath = `${sellerId}/${type}_${timestamp}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filePath, fileContent, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(filePath);

    const downloadUrl = `${publicUrl}?download=${encodeURIComponent(filename)}`;

    console.log('Export successful:', { filePath, publicUrl: downloadUrl });

    return new Response(
      JSON.stringify({ fileUrl: downloadUrl, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
