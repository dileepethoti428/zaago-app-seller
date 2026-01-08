import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  // Convert to IST (UTC+5:30)
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

const generateRefillListCSV = (items: RefillItem[], sellerName: string): string => {
  const { fullDateTime, date, tomorrowDate } = getISTDateTime();
  
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
  
  // Add separator
  const separator = ['', '', '--- PRODUCT SUMMARY ---', '', '', '', '', '', '', '', '', '', '', ''].join(',');
  
  // Add summary rows
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

// PDF Generation Functions (text-based format for Deno compatibility)
const generateRefillListPDF = (items: RefillItem[], sellerName: string): string => {
  const { fullDateTime, tomorrowDate } = getISTDateTime();
  
  let content = 'REFILL LIST REPORT\n';
  content += '='.repeat(60) + '\n\n';
  content += `Seller: ${sellerName}\n`;
  content += `For Date: ${tomorrowDate}\n`;
  content += `Generated: ${fullDateTime} IST\n\n`;
  content += '-'.repeat(60) + '\n\n';
  
  content += 'SUMMARY\n';
  content += '-'.repeat(30) + '\n';
  content += `Total Products: ${items.length}\n`;
  content += `Total Refill Needed: ${items.reduce((sum, i) => sum + i.refillNeeded, 0)} units\n\n`;
  
  content += 'DETAILED LIST\n';
  content += '-'.repeat(60) + '\n\n';
  
  items.forEach((item, i) => {
    content += `${i + 1}. ${item.productName}\n`;
    content += `   Current Stock:     ${item.currentStock} ${item.unit}\n`;
    content += `   Sold Today:        ${item.soldToday} ${item.unit}\n`;
    content += `   Required Tomorrow: ${item.requiredTomorrow} ${item.unit}\n`;
    content += `   REFILL NEEDED:     ${item.refillNeeded} ${item.unit}\n`;
    content += '\n';
  });
  
  content += '\n' + '='.repeat(60) + '\n';
  content += 'End of Report\n';
  
  return content;
};

const generateWeeklyReportPDF = (products: WeeklyProduct[], sellerName: string, dateRange: { start: string; end: string }): string => {
  const { fullDateTime } = getISTDateTime();
  
  let content = 'WEEKLY REFILL TREND REPORT\n';
  content += '='.repeat(60) + '\n\n';
  content += `Seller: ${sellerName}\n`;
  content += `Period: ${dateRange.start} to ${dateRange.end}\n`;
  content += `Generated: ${fullDateTime} IST\n\n`;
  content += '-'.repeat(60) + '\n\n';
  
  // Summary
  const totalRefill = products.reduce((sum, p) => sum + p.totalRefillQuantity, 0);
  const totalSold = products.reduce((sum, p) => 
    sum + p.dailyData.reduce((s, d) => s + d.sold, 0), 0);
  const totalForecast = products.reduce((sum, p) => 
    sum + p.dailyData.reduce((s, d) => s + d.forecast, 0), 0);
  
  content += 'SUMMARY\n';
  content += '-'.repeat(30) + '\n';
  content += `Total Products: ${products.length}\n`;
  content += `Total Sold: ${totalSold}\n`;
  content += `Total Forecast: ${totalForecast}\n`;
  content += `Total Refill Needed: ${totalRefill}\n\n`;
  
  content += 'TOP PRODUCTS BY REFILL QUANTITY\n';
  content += '-'.repeat(60) + '\n\n';
  
  const sortedProducts = [...products].sort((a, b) => b.totalRefillQuantity - a.totalRefillQuantity);
  
  sortedProducts.slice(0, 10).forEach((product, i) => {
    content += `${i + 1}. ${product.productName}\n`;
    content += `   Days Needing Refill: ${product.daysRefillNeeded}\n`;
    content += `   Total Refill:        ${product.totalRefillQuantity} ${product.unit}\n`;
    content += `   Avg Daily Refill:    ${product.avgDailyRefill.toFixed(1)} ${product.unit}\n`;
    content += '\n';
  });
  
  content += '\nDAILY BREAKDOWN\n';
  content += '-'.repeat(60) + '\n\n';
  
  products.forEach(product => {
    content += `${product.productName} (${product.unit})\n`;
    product.dailyData.forEach(day => {
      content += `  ${day.dayLabel} (${day.date}): Sold ${day.sold}, Forecast ${day.forecast}, Refill ${day.refillNeeded}\n`;
    });
    content += '\n';
  });
  
  content += '\n' + '='.repeat(60) + '\n';
  content += 'End of Report\n';
  
  return content;
};

const generateDeliveryReportPDF = (
  orders: DeliveryReportItem[], 
  productSummary: ProductSummary[], 
  selectedDate: string
): string => {
  const { fullDateTime } = getISTDateTime();
  
  let content = 'DELIVERY REPORT\n';
  content += '='.repeat(60) + '\n\n';
  content += `Date: ${selectedDate}\n`;
  content += `Generated: ${fullDateTime} IST\n\n`;
  content += '-'.repeat(60) + '\n\n';
  
  // Summary
  const totalOrders = new Set(orders.map(o => o.orderId)).size;
  const totalAmount = orders.reduce((sum, o) => sum + o.itemTotal, 0);
  
  content += 'SUMMARY\n';
  content += '-'.repeat(30) + '\n';
  content += `Total Orders: ${totalOrders}\n`;
  content += `Total Items: ${orders.length}\n`;
  content += `Total Amount: ₹${totalAmount.toFixed(2)}\n\n`;
  
  content += 'PRODUCT SUMMARY\n';
  content += '-'.repeat(40) + '\n';
  productSummary.forEach(product => {
    content += `${product.name}: ${product.quantity} units (${product.orders} orders)\n`;
  });
  content += '\n';
  
  content += 'ORDER DETAILS\n';
  content += '-'.repeat(60) + '\n\n';
  
  orders.forEach((order, i) => {
    content += `${i + 1}. Order: ${order.orderId}\n`;
    content += `   Customer: ${order.customerName} (${order.customerPhone})\n`;
    content += `   Product: ${order.productName} x ${order.quantity}\n`;
    content += `   Amount: ₹${order.itemTotal} | Status: ${order.paymentStatus}\n`;
    content += `   Address: ${order.deliveryAddress}, ${order.city}\n`;
    if (order.specialInstructions) {
      content += `   Note: ${order.specialInstructions}\n`;
    }
    content += '\n';
  });
  
  content += '\n' + '='.repeat(60) + '\n';
  content += 'End of Report\n';
  
  return content;
};

serve(async (req) => {
  // Handle CORS preflight
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

    // Initialize Supabase client with service role for storage upload
    const supabaseUrl = 'https://amhpjsmubciahslghobw.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let fileContent: string;
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
      // Generate text-based report (compatible with Deno, opens in any text viewer)
      contentType = 'text/plain;charset=utf-8';
      
      if (type === 'refill-list') {
        fileContent = generateRefillListPDF(data as RefillItem[], sellerName);
        filename = `refill_list_${safeSellerName}_${date}.txt`;
      } else if (type === 'weekly-report') {
        fileContent = generateWeeklyReportPDF(data as WeeklyProduct[], sellerName, dateRange);
        filename = `weekly_refill_report_${safeSellerName}_${dateRange?.start || date}_${dateRange?.end || date}.txt`;
      } else if (type === 'delivery-report') {
        fileContent = generateDeliveryReportPDF(data as DeliveryReportItem[], productSummary || [], selectedDate || date);
        filename = `zaago-delivery-report-${selectedDate || date}.txt`;
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

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = format === 'csv' ? 'csv' : 'txt';
    const filePath = `${sellerId}/${type}_${timestamp}.${fileExtension}`;

    // Upload to Supabase Storage
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

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(filePath);

    // Add download filename parameter
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