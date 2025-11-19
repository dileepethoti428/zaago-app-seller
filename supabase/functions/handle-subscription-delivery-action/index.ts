import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to skip vacation dates
function skipVacationDates(date: Date, vacations: any[]): Date {
  const activeVacations = vacations.filter(v => v.status === 'active');
  
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, subscriptionId, action } = await req.json();
    
    if (!orderId || !subscriptionId || !action) {
      throw new Error('Missing required parameters: orderId, subscriptionId, action');
    }

    if (action !== 'accept' && action !== 'skip') {
      throw new Error('Invalid action. Must be "accept" or "skip"');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing ${action} action for order ${orderId}, subscription ${subscriptionId}`);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, subscriptions!inner(user_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    const now = new Date();
    const visibleUntil = order.visible_until ? new Date(order.visible_until) : null;
    const isLate = visibleUntil && now > visibleUntil;

    if (action === 'accept') {
      // ============ ACCEPT DELIVERY FLOW ============
      const newStatus = isLate ? 'accepted_late' : 'accepted_by_seller';

      console.log(`Accepting delivery - Status: ${newStatus}`);

      // 1. Update order with acceptance
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          seller_accepted_at: now.toISOString(),
          accepted_at: now.toISOString(),
          visible: false,
          acceptance_window_expired: false,
          updated_at: now.toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order:', updateError);
        throw updateError;
      }

      // 2. Get seller location for pickup
      const { data: sellerData } = await supabase
        .from('public_sellers')
        .select('location, business_name, phone')
        .eq('id', order.seller_id)
        .single();

      if (sellerData?.location) {
        const coords = sellerData.location.coordinates || sellerData.location;
        await supabase.from('orders').update({
          pickup_location: {
            lat: coords[1] || coords.lat,
            lng: coords[0] || coords.lng
          },
          seller_name: sellerData.business_name,
          seller_phone: sellerData.phone,
          seller_latitude: coords[1] || coords.lat,
          seller_longitude: coords[0] || coords.lng
        }).eq('id', orderId);
      }

      // 3. Auto-assign to delivery agent
      const { data: agents } = await supabase
        .from('delivery_agents')
        .select('*')
        .eq('is_active', true)
        .eq('is_online', true)
        .order('deliveries_today', { ascending: true })
        .order('performance_score', { ascending: false })
        .limit(1);

      if (agents && agents.length > 0) {
        const agent = agents[0];
        
        console.log(`Assigning order to agent ${agent.name}`);

        // Update order with agent assignment
        await supabase.from('orders').update({
          assigned_agent_id: agent.id,
          status: 'assigned',
          updated_at: now.toISOString()
        }).eq('id', orderId);
        
        // Notify agent
        await supabase.from('agent_notifications').insert({
          agent_id: agent.id,
          type: 'new_assignment',
          title: 'New Delivery Assignment',
          message: `You have been assigned subscription order #${order.tracking_id || orderId.slice(0, 8)}`,
          source_type: 'order',
          source_id: orderId,
          metadata: { order_id: orderId, subscription_id: subscriptionId }
        });
        
        // Increment agent deliveries
        await supabase.from('delivery_agents').update({
          deliveries_today: (agent.deliveries_today || 0) + 1
        }).eq('id', agent.id);

        // 4. Auto-pack order
        await supabase.from('orders').update({
          status: 'packed',
          pickup_status: 'ready',
          updated_at: now.toISOString()
        }).eq('id', orderId);

        console.log('Order auto-packed and ready for pickup');
      } else {
        console.log('No agents available - order will be assigned when agent comes online');
      }

      // 5. Update subscription next_delivery_date
      const { data: vacations } = await supabase
        .from('subscription_vacation_periods')
        .select('start_date, end_date, status')
        .eq('subscription_id', subscriptionId)
        .eq('status', 'active');

      let nextDelivery = new Date();
      nextDelivery.setDate(nextDelivery.getDate() + 1);

      if (vacations && vacations.length > 0) {
        nextDelivery = skipVacationDates(nextDelivery, vacations);
      }

      await supabase.from('subscriptions').update({
        next_delivery_date: nextDelivery.toISOString().split('T')[0]
      }).eq('id', subscriptionId);

      // 6. Log event
      await supabase.from('order_visibility_logs').insert({
        order_id: orderId,
        event_type: isLate ? 'late_acceptance' : 'accepted',
        status_before: 'pending_seller_acceptance',
        status_after: agents && agents.length > 0 ? 'packed' : newStatus,
        visible_until: order.visible_until,
        acceptance_time: now.toISOString(),
        metadata: { 
          subscription_id: subscriptionId, 
          auto_assigned: agents && agents.length > 0,
          auto_packed: agents && agents.length > 0
        }
      });

      if (isLate) {
        // Send admin notification for late acceptance
        await supabase.from('admin_notifications').insert({
          title: 'Late Subscription Order Acceptance',
          message: `Order ${order.tracking_id || orderId.slice(0, 8)} was accepted after 11:30 AM IST deadline`,
          type: 'subscription_late_acceptance',
          metadata: {
            order_id: orderId,
            subscription_id: subscriptionId,
            visible_until: order.visible_until,
            accepted_at: now.toISOString()
          }
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'accept',
          assigned: agents && agents.length > 0,
          status: agents && agents.length > 0 ? 'packed' : newStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // ============ SKIP DELIVERY FLOW ============
      console.log('Skipping delivery');

      // 1. Update order to skipped status
      const { error: skipError } = await supabase
        .from('orders')
        .update({
          status: 'skipped_by_seller',
          visible: false,
          seller_accepted_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', orderId);

      if (skipError) {
        console.error('Error skipping order:', skipError);
        throw skipError;
      }

      // 2. Fetch subscription and vacations
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*, subscription_vacation_periods(start_date, end_date, status)')
        .eq('id', subscriptionId)
        .single();

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const { data: vacations } = await supabase
        .from('subscription_vacation_periods')
        .select('start_date, end_date, status')
        .eq('subscription_id', subscriptionId)
        .eq('status', 'active');

      // 3. Extend subscription by 1 day
      let nextDelivery = new Date(subscription.next_delivery_date);
      nextDelivery.setDate(nextDelivery.getDate() + 1);

      if (vacations && vacations.length > 0) {
        nextDelivery = skipVacationDates(nextDelivery, vacations);
      }

      await supabase.from('subscriptions').update({
        next_delivery_date: nextDelivery.toISOString().split('T')[0],
        vacation_extension_days: (subscription.vacation_extension_days || 0) + 1
      }).eq('id', subscriptionId);

      console.log(`Extended subscription to ${nextDelivery.toISOString().split('T')[0]}`);

      // 4. Notify customer
      await supabase.from('notifications').insert({
        user_id: order.subscriptions.user_id,
        title: 'Delivery Skipped for Today',
        message: `Your subscription delivery for today has been skipped. Your next delivery is scheduled for ${nextDelivery.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
        type: 'subscription_skip',
        metadata: { 
          subscription_id: subscriptionId,
          skipped_date: subscription.next_delivery_date,
          new_delivery_date: nextDelivery.toISOString().split('T')[0]
        }
      });

      // 5. Log event
      await supabase.from('order_visibility_logs').insert({
        order_id: orderId,
        event_type: 'skipped',
        status_before: 'pending_seller_acceptance',
        status_after: 'skipped_by_seller',
        acceptance_time: now.toISOString(),
        metadata: { 
          subscription_id: subscriptionId,
          extended_by_days: 1,
          new_next_delivery_date: nextDelivery.toISOString().split('T')[0]
        }
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'skip',
          new_delivery_date: nextDelivery.toISOString().split('T')[0]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error processing subscription delivery action:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process action'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
