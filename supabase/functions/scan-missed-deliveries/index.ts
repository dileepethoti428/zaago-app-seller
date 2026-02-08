import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MissedOrder {
  id: string;
  status: string;
  seller_id: string | null;
  subscription_id: string | null;
  items: any;
  delivery_date: string | null;
  created_at: string;
}

interface MissedDailyOrder {
  id: string;
  status: string;
  subscription_id: string;
  customer_id: string;
  date: string;
  quantity: number;
}

function getISTDateString(date: Date): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional parameters from request body
    let sellerIdFilter: string | null = null;
    let daysBack = 30;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        sellerIdFilter = body.seller_id || null;
        daysBack = body.days_back || 30;
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    console.log(`Starting scan for missed deliveries. Days back: ${daysBack}, Seller filter: ${sellerIdFilter || 'none'}`);

    const now = new Date();
    const todayIST = getISTDateString(now);

    // Calculate start date for scanning
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateIST = getISTDateString(startDate);

    console.log(`Scanning from ${startDateIST} to ${todayIST} (exclusive of today)`);

    let compensationsCreated = 0;
    let ordersMissed = 0;
    let dailyOrdersMissed = 0;
    let stalePendingFound = 0;
    const errors: string[] = [];

    // ========================================
    // 1. Scan regular orders with failed status
    // ========================================
    const failedStatuses = ['delivery_failed', 'undelivered', 'technical_error', 'agent_unavailable', 'not_delivered'];
    
    let ordersQuery = supabase
      .from('orders')
      .select('id, status, seller_id, subscription_id, items, delivery_date, created_at')
      .in('status', failedStatuses)
      .gte('created_at', `${startDateIST}T00:00:00`)
      .lt('created_at', `${todayIST}T00:00:00`);

    if (sellerIdFilter) {
      ordersQuery = ordersQuery.eq('seller_id', sellerIdFilter);
    }

    const { data: missedOrders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching missed orders:', ordersError);
      errors.push(`Orders fetch error: ${ordersError.message}`);
    } else {
      console.log(`Found ${missedOrders?.length || 0} missed orders with failed status`);
      ordersMissed = missedOrders?.length || 0;

      for (const order of (missedOrders || []) as MissedOrder[]) {
        try {
          const { data: existingComp } = await supabase
            .from('vacation_compensations')
            .select('id')
            .eq('order_id', order.id)
            .maybeSingle();

          if (existingComp) continue;

          let productId: string | null = null;
          let sellerId: string | null = order.seller_id;
          let quantity = 1;

          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            const firstItem = order.items[0];
            productId = firstItem.product_id || firstItem.id || null;
            quantity = firstItem.quantity || 1;
          }

          if (!sellerId && productId) {
            const { data: product } = await supabase
              .from('products')
              .select('seller_id')
              .eq('id', productId)
              .single();
            sellerId = product?.seller_id || null;
          }

          if (!sellerId) continue;

          let vacationPeriodId: string | null = null;
          let reason = 'delivery_failed';

          if (order.subscription_id) {
            const { data: subscription } = await supabase
              .from('subscriptions')
              .select('customer_id')
              .eq('id', order.subscription_id)
              .single();

            const deliveryDate = order.delivery_date || order.created_at.split('T')[0];

            const { data: vacationPeriod } = await supabase
              .from('subscription_vacation_periods')
              .select('id')
              .eq('subscription_id', order.subscription_id)
              .eq('status', 'active')
              .lte('start_date', deliveryDate)
              .gte('end_date', deliveryDate)
              .maybeSingle();

            if (vacationPeriod) {
              vacationPeriodId = vacationPeriod.id;
              reason = 'vacation';
            }

            if (!vacationPeriodId) {
              reason = order.status === 'technical_error' ? 'technical_error' :
                       order.status === 'agent_unavailable' ? 'agent_issue' :
                       order.status === 'not_delivered' ? 'agent_issue' :
                       'delivery_failed';
            }

            const { error: insertError } = await supabase
              .from('vacation_compensations')
              .insert({
                subscription_id: order.subscription_id,
                vacation_period_id: vacationPeriodId,
                order_id: order.id,
                customer_id: subscription?.customer_id || null,
                product_id: productId,
                seller_id: sellerId,
                original_vacation_date: order.delivery_date || order.created_at.split('T')[0],
                quantity: quantity,
                reason: reason,
                compensation_type: 'extra_delivery',
                status: 'pending',
                delivery_failed_at: new Date().toISOString(),
              });

            if (insertError) {
              // Skip duplicate constraint violations silently
              if (insertError.code !== '23505') {
                console.error(`Error creating compensation for order ${order.id}:`, insertError);
                errors.push(`Order ${order.id}: ${insertError.message}`);
              }
            } else {
              compensationsCreated++;
            }
          }
        } catch (e) {
          console.error(`Error processing order ${order.id}:`, e);
          errors.push(`Order ${order.id}: ${String(e)}`);
        }
      }
    }

    // ========================================
    // 2. Scan daily_orders with explicit failure statuses
    // ========================================
    const dailyFailedStatuses = ['failed', 'undelivered', 'cancelled_agent', 'not_delivered', 'delivery_failed'];

    let dailyQuery = supabase
      .from('daily_orders')
      .select('id, status, subscription_id, customer_id, date, quantity')
      .in('status', dailyFailedStatuses)
      .gte('date', startDateIST)
      .lt('date', todayIST);

    const { data: missedDailyOrders, error: dailyError } = await dailyQuery;

    if (dailyError) {
      console.error('Error fetching missed daily orders:', dailyError);
      errors.push(`Daily orders fetch error: ${dailyError.message}`);
    } else {
      console.log(`Found ${missedDailyOrders?.length || 0} missed daily orders with failed status`);
      dailyOrdersMissed = missedDailyOrders?.length || 0;

      for (const dailyOrder of (missedDailyOrders || []) as MissedDailyOrder[]) {
        const created = await processDailyOrder(supabase, dailyOrder, sellerIdFilter, errors);
        if (created) compensationsCreated++;
      }
    }

    // ========================================
    // 3. NEW: Scan stale PENDING daily_orders (past-due, never delivered)
    // ========================================
    console.log(`Scanning for stale pending daily_orders from ${startDateIST} to ${todayIST}...`);

    let stalePendingQuery = supabase
      .from('daily_orders')
      .select('id, status, subscription_id, customer_id, date, quantity')
      .eq('status', 'pending')
      .gte('date', startDateIST)
      .lt('date', todayIST);

    const { data: stalePendingOrders, error: staleError } = await stalePendingQuery;

    if (staleError) {
      console.error('Error fetching stale pending orders:', staleError);
      errors.push(`Stale pending fetch error: ${staleError.message}`);
    } else {
      console.log(`Found ${stalePendingOrders?.length || 0} stale pending daily orders`);
      stalePendingFound = stalePendingOrders?.length || 0;

      for (const dailyOrder of (stalePendingOrders || []) as MissedDailyOrder[]) {
        const created = await processDailyOrder(supabase, dailyOrder, sellerIdFilter, errors);
        if (created) compensationsCreated++;
      }
    }

    // Log execution results
    const { error: logError } = await supabase
      .from('cron_execution_logs')
      .insert({
        job_name: 'scan-missed-deliveries',
        status: errors.length > 0 ? 'completed_with_errors' : 'success',
        details: {
          date_range: `${startDateIST} to ${todayIST}`,
          days_back: daysBack,
          seller_filter: sellerIdFilter,
          orders_found: ordersMissed,
          daily_orders_found: dailyOrdersMissed,
          stale_pending_found: stalePendingFound,
          compensations_created: compensationsCreated,
          errors: errors.length > 0 ? errors : undefined,
        },
      });

    if (logError) {
      console.error('Error logging execution:', logError);
    }

    const result = {
      success: true,
      date_range: `${startDateIST} to ${todayIST}`,
      orders_found: ordersMissed,
      daily_orders_found: dailyOrdersMissed,
      stale_pending_found: stalePendingFound,
      compensations_created: compensationsCreated,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Scan completed:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Fatal error in scan-missed-deliveries:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper: Process a daily order into a compensation record
async function processDailyOrder(
  supabase: any,
  dailyOrder: MissedDailyOrder,
  sellerIdFilter: string | null,
  errors: string[]
): Promise<boolean> {
  try {
    // Check if compensation already exists by daily_order_id
    const { data: existingComp } = await supabase
      .from('vacation_compensations')
      .select('id')
      .eq('daily_order_id', dailyOrder.id)
      .maybeSingle();

    if (existingComp) return false;

    // Also check by subscription_id + date
    const { data: existingByDate } = await supabase
      .from('vacation_compensations')
      .select('id')
      .eq('subscription_id', dailyOrder.subscription_id)
      .eq('original_vacation_date', dailyOrder.date)
      .maybeSingle();

    if (existingByDate) return false;

    // Get subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('product_id')
      .eq('id', dailyOrder.subscription_id)
      .single();

    if (!subscription) return false;

    // Get product and seller
    const { data: product } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', subscription.product_id)
      .single();

    if (!product) return false;

    // Apply seller filter if provided
    if (sellerIdFilter && product.seller_id !== sellerIdFilter) return false;

    // Check for vacation period
    const { data: vacationPeriod } = await supabase
      .from('subscription_vacation_periods')
      .select('id')
      .eq('subscription_id', dailyOrder.subscription_id)
      .eq('status', 'active')
      .lte('start_date', dailyOrder.date)
      .gte('end_date', dailyOrder.date)
      .maybeSingle();

    let reason: string;
    if (vacationPeriod) {
      reason = 'vacation';
    } else if (dailyOrder.status === 'cancelled_agent') {
      reason = 'agent_issue';
    } else if (dailyOrder.status === 'pending') {
      // Stale pending = delivery was never attempted
      reason = 'delivery_failed';
    } else {
      reason = 'delivery_failed';
    }

    const { error: insertError } = await supabase
      .from('vacation_compensations')
      .insert({
        subscription_id: dailyOrder.subscription_id,
        vacation_period_id: vacationPeriod?.id || null,
        daily_order_id: dailyOrder.id,
        customer_id: dailyOrder.customer_id,
        product_id: subscription.product_id,
        seller_id: product.seller_id,
        original_vacation_date: dailyOrder.date,
        quantity: dailyOrder.quantity,
        reason: reason,
        compensation_type: 'extra_delivery',
        status: 'pending',
        delivery_failed_at: new Date().toISOString(),
      });

    if (insertError) {
      // Skip duplicate constraint violations
      if (insertError.code !== '23505') {
        console.error(`Error creating compensation for daily_order ${dailyOrder.id}:`, insertError);
        errors.push(`Daily order ${dailyOrder.id}: ${insertError.message}`);
      }
      return false;
    }

    console.log(`Created compensation for daily_order ${dailyOrder.id} (${reason})`);
    return true;
  } catch (e) {
    console.error(`Error processing daily_order ${dailyOrder.id}:`, e);
    errors.push(`Daily order ${dailyOrder.id}: ${String(e)}`);
    return false;
  }
}
