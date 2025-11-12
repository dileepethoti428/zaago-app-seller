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

    // Get all active subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        subscription_type,
        next_delivery_date,
        vacation:subscription_vacation_periods(start_date, end_date, status)
      `)
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    console.log(`📦 Found ${subscriptions?.length || 0} active subscriptions to update`);

    let updatedCount = 0;
    let errorCount = 0;

    // Update each subscription
    for (const sub of subscriptions || []) {
      try {
        // Calculate tomorrow's date (IST context - function runs at midnight IST)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Skip vacation dates
        const nextDate = skipVacationDates(tomorrow, sub.vacation || []);
        
        const nextDateStr = nextDate.toISOString().split('T')[0];

        // Update subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ 
            next_delivery_date: nextDateStr,
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`❌ Failed to update subscription ${sub.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Updated subscription ${sub.id} to next delivery: ${nextDateStr}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing subscription ${sub.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Subscription date update completed: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription dates updated successfully',
        summary: {
          total: subscriptions?.length || 0,
          updated: updatedCount,
          errors: errorCount,
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
