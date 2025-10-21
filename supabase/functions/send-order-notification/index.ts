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

  try {
    const { orderId, status, userId } = await req.json();
    
    console.log('Send order notification request:', { orderId, status, userId });
    
    // Get secrets
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalRestKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!oneSignalAppId || !oneSignalRestKey) {
      console.error('OneSignal credentials missing');
      return new Response(
        JSON.stringify({ error: 'OneSignal credentials not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    
    // Get user's player ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onesignal_player_id')
      .eq('user_id', userId)
      .single();
      
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!profile?.onesignal_player_id) {
      console.log('No OneSignal player ID found for user:', userId);
      
      // Still create a notification record in database even without push
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Order Update',
        message: `Your order status has been updated to: ${status}`,
        type: 'order_update',
        order_id: orderId,
        role: 'user',
        metadata: { status, note: 'Push notification skipped - no player ID' }
      });
      
      // Return success even without player ID - don't block order updates
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Notification created in database (push skipped - no OneSignal player ID)' 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (orderError) {
      console.error('Error fetching order:', orderError);
    }
    
    // Map status to user-friendly messages
    const statusMessages: Record<string, { heading: string; message: string }> = {
      placed: { heading: 'Order Confirmed', message: 'Your order has been placed successfully!' },
      accepted: { heading: 'Order Accepted', message: 'Seller has accepted your order' },
      confirmed: { heading: 'Order Confirmed', message: 'Your order has been confirmed' },
      preparing: { heading: 'Order Being Prepared', message: 'Your order is being prepared' },
      packed: { heading: 'Order Packed', message: 'Your order has been packed' },
      assigned: { heading: 'Delivery Agent Assigned', message: 'A delivery agent has been assigned to your order' },
      out_for_delivery: { heading: 'Out for Delivery', message: 'Your order is on the way!' },
      delivered: { heading: 'Order Delivered', message: 'Your order has been delivered' },
      cancelled: { heading: 'Order Cancelled', message: 'Your order was cancelled' }
    };
    
    const statusInfo = statusMessages[status] || { 
      heading: 'Order Update', 
      message: `Order status updated to: ${status}` 
    };
    
    const orderIdShort = orderId.toString().slice(0, 8);
    const orderTotal = order?.total || 0;
    
    // Send notification to OneSignal
    console.log('Sending notification to OneSignal for player:', profile.onesignal_player_id);
    
    const oneSignalPayload = {
      app_id: oneSignalAppId,
      include_player_ids: [profile.onesignal_player_id],
      headings: { en: statusInfo.heading },
      contents: { 
        en: `${statusInfo.message}\nOrder #${orderIdShort} - ₹${orderTotal}` 
      },
      data: {
        orderId,
        status,
        orderTotal,
        type: 'order_update'
      }
    };
    
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalRestKey}`
      },
      body: JSON.stringify(oneSignalPayload)
    });
    
    const oneSignalResult = await oneSignalResponse.json();
    console.log('OneSignal response:', oneSignalResult);
    
    if (!oneSignalResponse.ok) {
      console.error('OneSignal API error:', oneSignalResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: oneSignalResult }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create notification record in database
    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: userId,
      title: statusInfo.heading,
      message: statusInfo.message,
      type: 'order_update',
      order_id: orderId,
      role: 'user',
      metadata: { status, oneSignalResult }
    });
    
    if (notificationError) {
      console.error('Error creating notification record:', notificationError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        oneSignalResult,
        message: 'Notification sent successfully'
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in send-order-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
