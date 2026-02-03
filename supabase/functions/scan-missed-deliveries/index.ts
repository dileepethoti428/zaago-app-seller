import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scan for missed deliveries...');

    // Calculate yesterday's date in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset);
    istNow.setDate(istNow.getDate() - 1);
    const yesterdayIST = istNow.toISOString().split('T')[0];

    console.log(`Scanning for missed deliveries on: ${yesterdayIST}`);

    let compensationsCreated = 0;
    let ordersMissed = 0;
    let dailyOrdersMissed = 0;
    const errors: string[] = [];

    // ========================================
    // Scan regular orders with failed status
    // ========================================
    const failedStatuses = ['delivery_failed', 'undelivered', 'technical_error', 'agent_unavailable', 'not_delivered'];
    
    const { data: missedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, seller_id, subscription_id, items, delivery_date, created_at')
      .in('status', failedStatuses)
      .gte('created_at', `${yesterdayIST}T00:00:00`)
      .lt('created_at', `${yesterdayIST}T23:59:59`);

    if (ordersError) {
      console.error('Error fetching missed orders:', ordersError);
      errors.push(`Orders fetch error: ${ordersError.message}`);
    } else {
      console.log(`Found ${missedOrders?.length || 0} missed orders from yesterday`);
      ordersMissed = missedOrders?.length || 0;

      // Process each missed order
      for (const order of (missedOrders || []) as MissedOrder[]) {
        try {
          // Check if compensation already exists
          const { data: existingComp } = await supabase
            .from('vacation_compensations')
            .select('id')
            .eq('order_id', order.id)
            .maybeSingle();

          if (existingComp) {
            console.log(`Compensation already exists for order ${order.id}, skipping`);
            continue;
          }

          // Extract product and seller info from items
          let productId: string | null = null;
          let sellerId: string | null = order.seller_id;
          let quantity = 1;

          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            const firstItem = order.items[0];
            productId = firstItem.product_id || firstItem.id || null;
            quantity = firstItem.quantity || 1;
          }

          // Get seller_id from product if not available
          if (!sellerId && productId) {
            const { data: product } = await supabase
              .from('products')
              .select('seller_id')
              .eq('id', productId)
              .single();
            sellerId = product?.seller_id || null;
          }

          if (!sellerId) {
            console.log(`No seller found for order ${order.id}, skipping`);
            continue;
          }

          // Check for vacation period
          let vacationPeriodId: string | null = null;
          let reason = 'delivery_failed';

          if (order.subscription_id) {
            // Get customer_id from subscription
            const { data: subscription } = await supabase
              .from('subscriptions')
              .select('customer_id')
              .eq('id', order.subscription_id)
              .single();

            const deliveryDate = order.delivery_date || order.created_at.split('T')[0];

            // Check if delivery date falls within active vacation
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

            // Determine reason based on status
            if (!vacationPeriodId) {
              reason = order.status === 'technical_error' ? 'technical_error' :
                       order.status === 'agent_unavailable' ? 'agent_issue' :
                       order.status === 'not_delivered' ? 'agent_issue' :
                       'delivery_failed';
            }

            // Create compensation
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
              console.error(`Error creating compensation for order ${order.id}:`, insertError);
              errors.push(`Order ${order.id}: ${insertError.message}`);
            } else {
              console.log(`Created compensation for order ${order.id}`);
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
    // Scan daily_orders with failed status
    // ========================================
    const dailyFailedStatuses = ['failed', 'undelivered', 'cancelled_agent', 'not_delivered', 'delivery_failed'];

    const { data: missedDailyOrders, error: dailyError } = await supabase
      .from('daily_orders')
      .select('id, status, subscription_id, customer_id, date, quantity')
      .in('status', dailyFailedStatuses)
      .eq('date', yesterdayIST);

    if (dailyError) {
      console.error('Error fetching missed daily orders:', dailyError);
      errors.push(`Daily orders fetch error: ${dailyError.message}`);
    } else {
      console.log(`Found ${missedDailyOrders?.length || 0} missed daily orders from yesterday`);
      dailyOrdersMissed = missedDailyOrders?.length || 0;

      // Process each missed daily order
      for (const dailyOrder of (missedDailyOrders || []) as MissedDailyOrder[]) {
        try {
          // Check if compensation already exists
          const { data: existingComp } = await supabase
            .from('vacation_compensations')
            .select('id')
            .eq('daily_order_id', dailyOrder.id)
            .maybeSingle();

          if (existingComp) {
            console.log(`Compensation already exists for daily_order ${dailyOrder.id}, skipping`);
            continue;
          }

          // Also check by subscription_id + date
          const { data: existingByDate } = await supabase
            .from('vacation_compensations')
            .select('id')
            .eq('subscription_id', dailyOrder.subscription_id)
            .eq('original_vacation_date', dailyOrder.date)
            .maybeSingle();

          if (existingByDate) {
            console.log(`Compensation already exists for subscription ${dailyOrder.subscription_id} on ${dailyOrder.date}, skipping`);
            continue;
          }

          // Get subscription details
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('product_id')
            .eq('id', dailyOrder.subscription_id)
            .single();

          if (!subscription) {
            console.log(`No subscription found for daily_order ${dailyOrder.id}, skipping`);
            continue;
          }

          // Get product and seller
          const { data: product } = await supabase
            .from('products')
            .select('seller_id')
            .eq('id', subscription.product_id)
            .single();

          if (!product) {
            console.log(`No product found for subscription ${dailyOrder.subscription_id}, skipping`);
            continue;
          }

          // Check for vacation period
          const { data: vacationPeriod } = await supabase
            .from('subscription_vacation_periods')
            .select('id')
            .eq('subscription_id', dailyOrder.subscription_id)
            .eq('status', 'active')
            .lte('start_date', dailyOrder.date)
            .gte('end_date', dailyOrder.date)
            .maybeSingle();

          const reason = vacationPeriod ? 'vacation' :
                         dailyOrder.status === 'cancelled_agent' ? 'agent_issue' :
                         'delivery_failed';

          // Create compensation
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
            console.error(`Error creating compensation for daily_order ${dailyOrder.id}:`, insertError);
            errors.push(`Daily order ${dailyOrder.id}: ${insertError.message}`);
          } else {
            console.log(`Created compensation for daily_order ${dailyOrder.id}`);
            compensationsCreated++;
          }
        } catch (e) {
          console.error(`Error processing daily_order ${dailyOrder.id}:`, e);
          errors.push(`Daily order ${dailyOrder.id}: ${String(e)}`);
        }
      }
    }

    // Log execution results
    const { error: logError } = await supabase
      .from('cron_execution_logs')
      .insert({
        job_name: 'scan-missed-deliveries',
        status: errors.length > 0 ? 'completed_with_errors' : 'success',
        details: {
          date_scanned: yesterdayIST,
          orders_found: ordersMissed,
          daily_orders_found: dailyOrdersMissed,
          compensations_created: compensationsCreated,
          errors: errors.length > 0 ? errors : undefined,
        },
      });

    if (logError) {
      console.error('Error logging execution:', logError);
    }

    const result = {
      success: true,
      date_scanned: yesterdayIST,
      orders_found: ordersMissed,
      daily_orders_found: dailyOrdersMissed,
      compensations_created: compensationsCreated,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Scan completed:', result);

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
