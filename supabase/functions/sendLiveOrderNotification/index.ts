import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    console.log('Processing new order notification for order:', orderId);

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Get environment variables
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.error('OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ error: 'OneSignal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, items, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      throw new Error('Order not found');
    }

    console.log('Order fetched:', order.id, 'Total:', order.total);

    // Extract unique seller IDs from order items
    const items = order.items || [];
    const sellerIds = [...new Set(items.map((item: any) => item.seller_id).filter(Boolean))];
    
    console.log('Found unique sellers:', sellerIds.length);

    if (sellerIds.length === 0) {
      console.log('No sellers found in order items');
      return new Response(
        JSON.stringify({ message: 'No sellers to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process notifications for each seller
    const notificationResults = await Promise.all(
      sellerIds.map(async (sellerId) => {
        try {
          console.log('Processing notification for seller:', sellerId);

          // The sellerId in items is actually the user_id, so query by user_id
          const { data: seller, error: sellerError } = await supabase
            .from('sellers')
            .select('id, user_id')
            .eq('user_id', sellerId)
            .single();

          if (sellerError || !seller) {
            console.error('Seller not found for user_id:', sellerId, sellerError);
            return { sellerId, success: false, error: 'Seller not found' };
          }

          const sellerUserId = seller.user_id;
          const actualSellerId = seller.id;
          console.log('Found seller - user_id:', sellerUserId, 'seller_id:', actualSellerId);

          // Get seller's OneSignal player ID
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onesignal_player_id')
            .eq('user_id', sellerUserId)
            .single();

          if (profileError || !profile) {
            console.log('Profile not found for seller:', sellerUserId);
          }

          const playerId = profile?.onesignal_player_id;

          // Create notification record in database
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: sellerUserId,
              type: 'new_order',
              role: 'seller',
              title: 'New Order Received!',
              message: 'New order received! Check the order details to process delivery.',
              order_id: orderId,
              is_read: false,
            });

          if (notificationError) {
            console.error('Error creating notification record:', notificationError);
          } else {
            console.log('Notification record created for seller:', sellerUserId);
          }

          // Send push notification if player ID exists
          if (playerId) {
            console.log('Sending push notification to player:', playerId);

            const itemCount = items.filter((item: any) => item.seller_id === sellerId).length;
            const orderShortId = orderId.substring(0, 8);

            const oneSignalPayload = {
              app_id: oneSignalAppId,
              include_player_ids: [playerId],
              headings: { en: 'New Order Received!' },
              contents: {
                en: `New order received! Check the order details to process delivery.\nOrder #${orderShortId} - ₹${order.total} (${itemCount} item${itemCount > 1 ? 's' : ''})`,
              },
              
              // Priority and visibility settings for lock screen
              priority: 10,  // High priority (scale 1-10)
              
              // iOS specific settings
              ios_badgeType: "Increase",
              ios_badgeCount: 1,
              ios_sound: "default",
              
              // Android specific settings
              android_channel_id: "new_orders",
              android_visibility: 1,  // Public - show on lock screen
              android_sound: "default",
              
              // Time to live (how long to keep trying to deliver)
              ttl: 3600,  // 1 hour
              
              data: {
                orderId: orderId,
                type: 'new_order',
                orderTotal: order.total,
                sellerId: sellerId,
              },
            };

            const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${oneSignalApiKey}`,
              },
              body: JSON.stringify(oneSignalPayload),
            });

            const oneSignalResult = await oneSignalResponse.json();
            console.log('OneSignal API response:', oneSignalResult);

            if (!oneSignalResponse.ok) {
              console.error('OneSignal API error:', oneSignalResult);
              return { sellerId, success: false, error: 'OneSignal API error', details: oneSignalResult };
            }

            return { sellerId, success: true, playerId, oneSignalResult };
          } else {
            console.log('No OneSignal player ID for seller:', sellerUserId);
            return { sellerId, success: true, message: 'Notification record created, no push sent (no player ID)' };
          }
        } catch (error) {
          console.error('Error processing seller notification:', sellerId, error);
          return { sellerId, success: false, error: error.message };
        }
      })
    );

    console.log('All notifications processed:', notificationResults);

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        sellersNotified: sellerIds.length,
        results: notificationResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sendLiveOrderNotification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
