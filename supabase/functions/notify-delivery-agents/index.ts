import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, orderStatus, orderData } = await req.json();

    console.log(`Processing order notification: ${orderId} with status: ${orderStatus}`);

    // Only process when order is accepted/confirmed (ready for delivery)
    if (!['accepted', 'confirmed', 'packed'].includes(orderStatus)) {
      return new Response(
        JSON.stringify({ message: 'Order status not eligible for delivery agent notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order details if not provided
    let order = orderData;
    if (!order) {
      const { data: orderDetails, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        throw new Error(`Failed to fetch order: ${orderError.message}`);
      }
      order = orderDetails;
    }

    // Calculate order location from delivery address
    const orderLocation = order.address?.coordinates || null;
    
    // Get active delivery agents
    const { data: agents, error: agentsError } = await supabase
      .from('delivery_agents')
      .select('id, name, email, agent_id')
      .eq('is_active', true)
      .eq('is_online', true);

    if (agentsError) {
      throw new Error(`Failed to fetch delivery agents: ${agentsError.message}`);
    }

    console.log(`Found ${agents?.length || 0} active delivery agents`);

    // Create notifications for all active agents
    const notifications = [];
    
    if (agents && agents.length > 0) {
      for (const agent of agents) {
        // Create agent notification
        const { error: notificationError } = await supabase
          .from('agent_notifications')
          .insert({
            agent_id: agent.id,
            type: 'new_order',
            title: 'New Order Available',
            message: `Order #${order.id.toString().slice(0, 8)} is ready for pickup. Total: ₹${order.total}`,
            source_type: 'order',
            source_id: orderId,
            metadata: {
              order_id: orderId,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              total_amount: order.total,
              pickup_address: order.address,
              order_status: orderStatus,
              items_count: Array.isArray(order.items) ? order.items.length : 0,
              location: orderLocation
            }
          });

        if (notificationError) {
          console.error(`Failed to create notification for agent ${agent.id}:`, notificationError);
        } else {
          notifications.push({
            agent_id: agent.id,
            agent_name: agent.name,
            notification_sent: true
          });
        }
      }
    }

    // Update order with notification status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        agent_notification_sent: true,
        agent_notification_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order notification status:', updateError);
    }

    // Log the notification activity
    const { error: logError } = await supabase
      .from('password_reset_logs')
      .insert({
        email: 'system@zaago.com',
        event_type: 'email_sent',
        metadata: {
          action: 'delivery_agent_notifications_sent',
          order_id: orderId,
          order_status: orderStatus,
          agents_notified: notifications.length,
          notification_details: notifications,
          order_total: order.total,
          customer_name: order.customer_name,
          timestamp: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('Failed to log notification activity:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notified ${notifications.length} delivery agents`,
        order_id: orderId,
        notifications_sent: notifications.length,
        agents_notified: notifications
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-delivery-agents function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to notify delivery agents'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});