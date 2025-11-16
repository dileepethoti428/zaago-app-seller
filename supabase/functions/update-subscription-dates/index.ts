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
        // Jump to day after vacation ends
        date = new Date(end);
        date.setDate(date.getDate() + 1);
        // Recursively check if new date also falls in another vacation
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

  console.log('🔄 Starting subscription date update at midnight IST...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`📅 Processing subscriptions with orders for ${todayStr}`);

    // Find all subscriptions that had an ACCEPTED or DELIVERED order today
    const { data: completedOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        subscription_id,
        status,
        delivery_date,
        subscription:subscriptions!orders_subscription_id_fkey(
          id,
          subscription_type,
          next_delivery_date,
          vacation:subscription_vacation_periods(start_date, end_date, status)
        )
      `)
      .eq('delivery_date', todayStr)
      .in('status', ['accepted', 'delivered', 'out_for_delivery'])
      .not('subscription_id', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch completed orders: ${fetchError.message}`);
    }

    console.log(`📦 Found ${completedOrders?.length || 0} accepted/delivered orders to process`);

    let updatedCount = 0;
    let errorCount = 0;
    const processedSubscriptions = new Set();

    // Update each subscription (only once per subscription)
    for (const order of completedOrders || []) {
      try {
        // Skip if already processed this subscription
        if (processedSubscriptions.has(order.subscription_id)) {
          continue;
        }
        processedSubscriptions.add(order.subscription_id);

        // Calculate tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Skip vacation dates
        const nextDate = skipVacationDates(tomorrow, order.subscription?.vacation || []);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        console.log(`✅ Updating subscription ${order.subscription_id} to next delivery: ${nextDateStr}`);

        // Update subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ 
            next_delivery_date: nextDateStr,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.subscription_id);

        if (updateError) {
          console.error(`❌ Failed to update subscription ${order.subscription_id}:`, updateError);
          errorCount++;
        } else {
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing order ${order.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Subscription date update completed: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription dates updated successfully',
        summary: {
          total: completedOrders?.length || 0,
          updated: updatedCount,
          errors: errorCount,
          date: todayStr
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Critical error updating subscription dates:', error);
    
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
