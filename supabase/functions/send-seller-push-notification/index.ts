import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    const { sellerId, notificationData } = await req.json();
    
    console.log('📲 Sending push notification to seller:', sellerId);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get seller's OneSignal player ID
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('onesignal_player_id')
      .eq('user_id', sellerId)
      .maybeSingle();

    if (sellerError || !seller?.onesignal_player_id) {
      console.log('⚠️ Seller has no OneSignal player ID registered');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Seller not registered for push notifications' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send push notification via OneSignal API
    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [seller.onesignal_player_id],
      headings: { en: notificationData.title || 'New Order' },
      contents: { en: notificationData.message || 'You have a new order' },
      data: {
        order_id: notificationData.order_id,
        customer_name: notificationData.customer_name,
        total: notificationData.order_total,
        type: 'new_order',
        ...notificationData
      },
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      android_channel_id: 'new_orders',
      priority: 10,
      ttl: 86400, // 24 hours
    };

    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const oneSignalResult = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      console.error('❌ OneSignal API error:', oneSignalResult);
      throw new Error(oneSignalResult.errors?.[0] || 'Failed to send push notification');
    }

    console.log('✅ Push notification sent successfully:', oneSignalResult.id);

    // Log the notification
    await supabase.from('password_reset_logs').insert({
      email: 'system@zaago.com',
      event_type: 'email_sent',
      metadata: {
        action: 'push_notification_sent',
        seller_id: sellerId,
        notification_id: oneSignalResult.id,
        recipients: oneSignalResult.recipients,
        order_id: notificationData.order_id,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: oneSignalResult.id,
        recipients: oneSignalResult.recipients
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
