import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const processingStart = new Date();
  console.log('🔄 Daily subscription processing started at:', processingStart.toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    let subscriptionsProcessed = 0;
    let ordersCreated = 0;
    let notificationsSent = 0;
    let errorsCount = 0;
    const errorDetails: any[] = [];

    // Fetch all active subscriptions where next_delivery_date is today or past
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        product_id,
        subscription_type,
        quantity,
        next_delivery_date,
        delivery_address,
        delivery_time_slot,
        delivery_time,
        special_instructions,
        delivery_days
      `)
      .eq('is_active', true)
      .lte('next_delivery_date', today);

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    console.log(`📦 Found ${subscriptions?.length || 0} active subscriptions to process`);

    if (!subscriptions || subscriptions.length === 0) {
      await supabase.from('daily_subscription_processing').insert({
        processing_date: today,
        subscriptions_processed: 0,
        orders_created: 0,
        notifications_sent: 0,
        errors_count: 0,
        processing_status: 'completed',
        started_at: processingStart.toISOString(),
        completed_at: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No subscriptions to process today',
          subscriptionsProcessed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        // Check if subscription type matches today's delivery schedule
        let shouldDeliver = false;

        if (subscription.subscription_type === 'daily') {
          shouldDeliver = true;
        } else if (subscription.subscription_type === 'alternate') {
          // Already filtered by next_delivery_date
          shouldDeliver = true;
        } else if (subscription.subscription_type === 'weekly') {
          // Check if delivery_days includes today
          if (subscription.delivery_days && subscription.delivery_days.includes(dayOfWeek)) {
            shouldDeliver = true;
          }
        }

        if (!shouldDeliver) {
          console.log(`⏭️ Skipping subscription ${subscription.id} - not scheduled for today`);
          continue;
        }

        // Fetch product details
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, price, image_url, seller_id')
          .eq('id', subscription.product_id)
          .single();

        if (productError || !product) {
          errorDetails.push({
            subscription_id: subscription.id,
            error: 'Product not found',
            details: productError?.message
          });
          errorsCount++;
          continue;
        }

        // Fetch customer profile for name and phone
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', subscription.user_id)
          .single();

        // Calculate total
        const itemTotal = Number(product.price) * subscription.quantity;

        // Create order record
        const orderData = {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          items: [{
            product_id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: subscription.quantity,
            seller_id: product.seller_id,
            image_url: product.image_url
          }],
          total: itemTotal,
          status: 'pending',
          address: subscription.delivery_address || {},
          delivery_address_id: null,
          delivery_date: today,
          delivery_time_slot: subscription.delivery_time_slot || 'morning',
          delivery_time: subscription.delivery_time || '12:00:00',
          special_instructions: subscription.special_instructions,
          customer_name: profile?.full_name || 'Customer',
          customer_phone: profile?.phone || null,
          payment_method: 'subscription',
          payment_status: 'pending',
          accepted_at: null, // Will be set when seller accepts before 11:00 PM IST
          order_type: 'subscription',
          created_at: new Date().toISOString()
        };

        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) {
          errorDetails.push({
            subscription_id: subscription.id,
            error: 'Failed to create order',
            details: orderError.message
          });
          errorsCount++;
          continue;
        }

        ordersCreated++;
        console.log(`✅ Created order ${newOrder.id} for subscription ${subscription.id}`);

        // Fetch vacation periods for this subscription
        const { data: vacations } = await supabase
          .from('subscription_vacation_periods')
          .select('start_date, end_date, status')
          .eq('subscription_id', subscription.id)
          .eq('status', 'active');

        // Calculate tomorrow's date
        let nextDeliveryDate = new Date();
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);

        // Skip vacation dates
        if (vacations && vacations.length > 0) {
          for (const vacation of vacations) {
            const start = new Date(vacation.start_date);
            const end = new Date(vacation.end_date);
            
            if (nextDeliveryDate >= start && nextDeliveryDate <= end) {
              // Jump to day after vacation ends
              nextDeliveryDate = new Date(end);
              nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
            }
          }
        }

        // DO NOT update next_delivery_date here
        // It will be updated by:
        // 1. check-unaccepted-orders at 11 AM if seller doesn't accept (+1 day compensation)
        // 2. update-subscription-dates at midnight if seller accepts (normal +1 day)
        console.log(`✅ Order created. Next delivery date will be updated after acceptance or at deadline.`);

        // Create notification for seller
        if (product.seller_id) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: product.seller_id,
              title: 'New Subscription Order',
              message: `You have a new subscription order for ${product.name}`,
              type: 'new_order',
              role: 'seller',
              order_id: newOrder.id,
              metadata: { 
                subscription_id: subscription.id,
                auto_generated: true,
                product_name: product.name,
                quantity: subscription.quantity
              }
            });

          if (!notifError) {
            notificationsSent++;
          }
        }

        subscriptionsProcessed++;

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, error);
        errorDetails.push({
          subscription_id: subscription.id,
          error: error.message,
          stack: error.stack
        });
        errorsCount++;
      }
    }

    const processingEnd = new Date();
    const processingStatus = errorsCount > 0 ? 'completed_with_errors' : 'completed';

    // Record processing results
    await supabase.from('daily_subscription_processing').insert({
      processing_date: today,
      subscriptions_processed: subscriptionsProcessed,
      orders_created: ordersCreated,
      notifications_sent: notificationsSent,
      errors_count: errorsCount,
      error_details: errorsCount > 0 ? errorDetails : null,
      processing_status: processingStatus,
      started_at: processingStart.toISOString(),
      completed_at: processingEnd.toISOString()
    });

    console.log('✅ Daily subscription processing completed:', {
      subscriptionsProcessed,
      ordersCreated,
      notificationsSent,
      errorsCount,
      status: processingStatus
    });

    // Trigger auto-assignment of delivery agents
    if (ordersCreated > 0) {
      console.log('🚀 Triggering auto-assignment...');
      try {
        await supabase.functions.invoke('auto-assign-delivery-agents');
      } catch (e) {
        console.error('⚠️ Auto-assignment error:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily subscription processing completed',
        summary: {
          subscriptionsProcessed,
          ordersCreated,
          notificationsSent,
          errorsCount,
          status: processingStatus,
          processingTime: `${(processingEnd.getTime() - processingStart.getTime()) / 1000}s`
        },
        errors: errorsCount > 0 ? errorDetails : []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Critical error in subscription processing:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
