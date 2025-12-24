import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get today's date in IST (UTC+5:30)
function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

// Get tomorrow's date in IST
function getTomorrowIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset + 24 * 60 * 60 * 1000);
  return istDate.toISOString().split('T')[0];
}

// Calculate next delivery date based on subscription type
function calculateNextDeliveryDate(
  subscriptionType: string,
  deliveryDays: number[] | null,
  currentDate: Date
): string {
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (subscriptionType === 'everyday') {
    return tomorrow.toISOString().split('T')[0];
  }

  if (subscriptionType === 'alternative') {
    // Every other day starting from tomorrow
    return tomorrow.toISOString().split('T')[0];
  }

  if (subscriptionType === 'weekend') {
    // Find next Saturday (6) or Sunday (0)
    let nextDate = new Date(tomorrow);
    while (nextDate.getDay() !== 0 && nextDate.getDay() !== 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate.toISOString().split('T')[0];
  }

  if (subscriptionType === 'custom' && deliveryDays && deliveryDays.length > 0) {
    // Find the next matching day from deliveryDays array
    // deliveryDays contains day indices (0=Sunday, 1=Monday, etc.)
    let nextDate = new Date(tomorrow);
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = nextDate.getDay();
      if (deliveryDays.includes(dayOfWeek)) {
        return nextDate.toISOString().split('T')[0];
      }
      nextDate.setDate(nextDate.getDate() + 1);
    }
  }

  // Default to tomorrow if no match
  return tomorrow.toISOString().split('T')[0];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const todayIST = getTodayIST();
    console.log(`[sync-subscription-dates] Starting sync. Today IST: ${todayIST}`);

    // Find all active subscriptions with stale next_delivery_date (in the past)
    const { data: staleSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, subscription_type, delivery_days, next_delivery_date, status')
      .eq('status', 'active')
      .lt('next_delivery_date', todayIST);

    if (fetchError) {
      console.error('[sync-subscription-dates] Error fetching stale subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`[sync-subscription-dates] Found ${staleSubscriptions?.length || 0} stale subscriptions`);

    if (!staleSubscriptions || staleSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No stale subscriptions found',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update each subscription with the correct next_delivery_date
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const currentDateIST = new Date(now.getTime() + istOffset);

    let updatedCount = 0;
    const errors: any[] = [];

    for (const sub of staleSubscriptions) {
      try {
        const nextDeliveryDate = calculateNextDeliveryDate(
          sub.subscription_type,
          sub.delivery_days as number[] | null,
          currentDateIST
        );

        console.log(`[sync-subscription-dates] Updating subscription ${sub.id}: ${sub.next_delivery_date} -> ${nextDeliveryDate}`);

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ next_delivery_date: nextDeliveryDate })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`[sync-subscription-dates] Error updating subscription ${sub.id}:`, updateError);
          errors.push({ id: sub.id, error: updateError.message });
        } else {
          updatedCount++;
        }
      } catch (err) {
        console.error(`[sync-subscription-dates] Exception for subscription ${sub.id}:`, err);
        errors.push({ id: sub.id, error: String(err) });
      }
    }

    console.log(`[sync-subscription-dates] Sync complete. Updated: ${updatedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${updatedCount} subscriptions`,
        updated: updatedCount,
        total: staleSubscriptions.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-subscription-dates] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
