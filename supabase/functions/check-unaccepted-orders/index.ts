import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to skip vacation dates
const skipVacationDates = (date: Date, vacations: any[]): Date => {
  const activeVacations = vacations.filter((v: any) => v.status === 'active');
  
  for (const vacation of activeVacations) {
    try {
      const start = new Date(vacation.start_date);
      const end = new Date(vacation.end_date);
      
      if (date >= start && date <= end) {
        date = new Date(end);
        date.setDate(date.getDate() + 1);
        return skipVacationDates(date, vacations);
      }
    } catch (error) {
      console.error('Error parsing vacation dates:', error);
    }
  }
  
  return date;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔍 Checking unaccepted subscription orders at 11:00 AM IST...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate today's date (orders were created yesterday at 11:30 PM for today's delivery)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`📅 Checking orders with delivery_date = ${todayStr}`);

    // Find subscription orders where visible_until has passed and still not accepted
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        subscription_id,
        delivery_date,
        created_at,
        visible_until,
        status,
        accepted_at,
        seller_accepted_at,
        visible,
        acceptance_window_expired,
        subscription:subscriptions!orders_subscription_id_fkey(
          id,
          next_delivery_date,
          subscription_type,
          vacation:subscription_vacation_periods(start_date, end_date, status)
        )
      `)
      .eq('status', 'pending_seller_acceptance')
      .eq('delivery_date', todayStr)
      .is('seller_accepted_at', null)
      .not('subscription_id', 'is', null)
      .lte('visible_until', new Date().toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch pending orders: ${fetchError.message}`);
    }

    console.log(`📦 Found ${pendingOrders?.length || 0} unaccepted orders for today`);

    let processedCount = 0;
    let errorCount = 0;

    // Process each unaccepted order
    for (const order of pendingOrders || []) {
      try {
        console.log(`❌ Processing unaccepted order ${order.id} for subscription ${order.subscription_id}`);

        // Mark order with expired acceptance window
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ 
            status: 'pending_after_cutoff',
            acceptance_window_expired: true,
            visible: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (orderUpdateError) {
          console.error(`Failed to update order ${order.id}:`, orderUpdateError);
          errorCount++;
          continue;
        }

        // Calculate next delivery date: tomorrow + skip vacations (+1 day compensation)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextDate = skipVacationDates(tomorrow, order.subscription?.vacation || []);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        console.log(`📅 Extending subscription ${order.subscription_id} to ${nextDateStr} (+1 day compensation)`);

        // Update subscription with extended next_delivery_date
        const { error: subUpdateError } = await supabase
          .from('subscriptions')
          .update({ 
            next_delivery_date: nextDateStr,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.subscription_id);

        if (subUpdateError) {
          console.error(`Failed to update subscription ${order.subscription_id}:`, subUpdateError);
          errorCount++;
          continue;
        }

        // Send escalation notification to ops/admin
        await supabase.from('admin_notifications').insert({
          title: 'Subscription Order - Acceptance Window Expired',
          message: `Order ${order.id} was not accepted by seller before 11:30 AM IST. Requires escalation.`,
          type: 'order_escalation',
          metadata: {
            order_id: order.id,
            subscription_id: order.subscription_id,
            visible_until: order.visible_until,
            current_time: new Date().toISOString()
          }
        });

        // Log the date shift
        const { error: logError } = await supabase
          .from('subscription_order_logs')
          .insert({
            subscription_id: order.subscription_id,
            order_id: order.id,
            event_type: 'not_accepted',
            original_date: todayStr,
            new_date: nextDateStr,
            reason: 'Seller did not accept by 11:30 AM IST deadline',
            created_at: new Date().toISOString()
          });
        
        // Log acceptance window expiry
        await supabase.from('order_visibility_logs').insert({
          order_id: order.id,
          event_type: 'expired',
          status_before: 'pending_seller_acceptance',
          status_after: 'pending_after_cutoff',
          visible_until: order.visible_until,
          metadata: {
            subscription_id: order.subscription_id,
            expired_at_ist: new Date().toISOString()
          }
        });

        if (logError) {
          console.error(`⚠️ Failed to log date shift for order ${order.id}:`, logError);
        }

        console.log(`✅ Processed order ${order.id}: marked pending_after_cutoff, extended subscription to ${nextDateStr}`);
        processedCount++;

      } catch (error) {
        console.error(`❌ Error processing order ${order.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Unaccepted orders check completed: ${processedCount} processed, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Unaccepted orders processed successfully',
        summary: {
          total: pendingOrders?.length || 0,
          processed: processedCount,
          errors: errorCount,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Critical error checking unaccepted orders:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
