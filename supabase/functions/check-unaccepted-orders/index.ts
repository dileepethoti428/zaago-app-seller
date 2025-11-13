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

  console.log('🕚 Checking unaccepted subscription orders at 11:00 PM IST...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in IST
    const todayIST = new Date().toISOString().split('T')[0];

    // Find all pending subscription orders for today that were not accepted
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        subscription_id,
        product_id,
        customer_id,
        subscription:subscriptions(
          id,
          next_delivery_date,
          vacation:subscription_vacation_periods(start_date, end_date, status)
        )
      `)
      .eq('status', 'pending')
      .eq('expected_delivery_date', todayIST)
      .not('subscription_id', 'is', null)
      .is('accepted_at', null);

    if (fetchError) {
      throw new Error(`Failed to fetch pending orders: ${fetchError.message}`);
    }

    console.log(`📋 Found ${pendingOrders?.length || 0} unaccepted orders to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const order of pendingOrders || []) {
      try {
        const subscription = Array.isArray(order.subscription) 
          ? order.subscription[0] 
          : order.subscription;

        if (!subscription) {
          console.error(`❌ No subscription found for order ${order.id}`);
          errorCount++;
          continue;
        }

        // Mark order as "not_accepted"
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({ 
            status: 'not_accepted',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateOrderError) {
          console.error(`❌ Failed to update order ${order.id}:`, updateOrderError);
          errorCount++;
          continue;
        }

        // Calculate next delivery date (tomorrow + skip vacations)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextDate = skipVacationDates(tomorrow, subscription.vacation || []);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        // Update subscription with extended date
        const { error: updateSubError } = await supabase
          .from('subscriptions')
          .update({ 
            next_delivery_date: nextDateStr,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.subscription_id);

        if (updateSubError) {
          console.error(`❌ Failed to update subscription ${order.subscription_id}:`, updateSubError);
          errorCount++;
          continue;
        }

        // Log the date shift
        const { error: logError } = await supabase
          .from('subscription_order_logs')
          .insert({
            subscription_id: order.subscription_id,
            order_id: order.id,
            event_type: 'not_accepted',
            original_date: todayIST,
            new_date: nextDateStr,
            reason: 'Seller did not accept by 11:00 PM IST deadline',
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.error(`⚠️ Failed to log date shift for order ${order.id}:`, logError);
          // Don't increment error count - logging failure shouldn't stop the process
        }

        console.log(`✅ Processed order ${order.id}: marked not_accepted, extended subscription to ${nextDateStr}`);
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
