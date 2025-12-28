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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create anon client to verify user
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Create service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    const {
      product_id,
      subscription_type,
      quantity,
      delivery_time_slot,
      delivery_address,
      customer_name,
      customer_phone,
      customer_email,
      start_date,
      next_delivery_date,
      location_id,
      latitude,
      longitude,
    } = body;

    // Validate required fields
    if (!product_id || !subscription_type || !quantity || !delivery_time_slot || !customer_name || !customer_phone) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['product_id', 'subscription_type', 'quantity', 'delivery_time_slot', 'customer_name', 'customer_phone']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Get product details to find seller_id
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, seller_id, name, price')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      console.error('Product fetch error:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found', details: productError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found product:', product.id, 'seller_id:', product.seller_id);

    const sellerId = product.seller_id;

    // Step 2: Derive location_id - CRITICAL: subscriptions.location_id is NOT NULL
    let finalLocationId: number = location_id || null;
    
    if (!finalLocationId) {
      // Try to get location_id from seller
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('location_id')
        .eq('id', sellerId)
        .single();
      
      if (sellerError) {
        console.warn('Seller lookup error:', sellerError);
      }
      
      if (seller?.location_id) {
        finalLocationId = seller.location_id;
        console.log('Derived location_id from seller:', finalLocationId);
      } else {
        // Fallback to default location 1
        finalLocationId = 1;
        console.log('Using default location_id:', finalLocationId);
      }
    }

    // Step 3: Find or create customer for this seller
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email, location_id')
      .eq('seller_id', sellerId)
      .eq('phone', customer_phone)
      .maybeSingle();

    if (findError) {
      console.error('Customer lookup error:', findError);
    }

    let customerId: string;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log('Found existing customer:', customerId, existingCustomer.full_name);

      // Update customer details if changed
      if (existingCustomer.full_name !== customer_name || existingCustomer.email !== customer_email) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            full_name: customer_name,
            email: customer_email || existingCustomer.email,
            address: delivery_address,
            latitude: latitude || null,
            longitude: longitude || null,
            location_id: finalLocationId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId);

        if (updateError) {
          console.warn('Customer update warning:', updateError);
        } else {
          console.log('Updated customer details for:', customerId);
        }
      }
    } else {
      // Create new customer for this seller
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          seller_id: sellerId,
          full_name: customer_name,
          phone: customer_phone,
          email: customer_email || null,
          address: delivery_address,
          latitude: latitude || null,
          longitude: longitude || null,
          location_id: finalLocationId,
        })
        .select('id')
        .single();

      if (createError || !newCustomer) {
        console.error('Customer creation error:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create customer', details: createError?.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customerId = newCustomer.id;
      console.log('Created new customer:', customerId, 'for seller:', sellerId);
    }

    // Step 4: Create subscription with correct fields
    // Note: use delivery_latitude/delivery_longitude (not latitude/longitude)
    // Note: location_id is NOT NULL - must always have a value
    const subscriptionData = {
      user_id: user.id,
      customer_id: customerId,
      product_id: product_id,
      subscription_type: subscription_type,
      quantity: quantity,
      delivery_time_slot: delivery_time_slot,
      delivery_address: delivery_address,
      start_date: start_date || new Date().toISOString().split('T')[0],
      next_delivery_date: next_delivery_date || start_date || new Date().toISOString().split('T')[0],
      status: 'active',
      is_active: true,
      delivery_latitude: latitude || null,
      delivery_longitude: longitude || null,
      location_id: finalLocationId,
      source: 'customer_app',
    };

    console.log('Creating subscription with data:', JSON.stringify(subscriptionData, null, 2));

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select('id, customer_id, user_id, status, location_id')
      .single();

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create subscription', 
          details: subscriptionError.message,
          code: subscriptionError.code,
          hint: subscriptionError.hint
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully created subscription:', subscription.id, 'customer_id:', subscription.customer_id, 'location_id:', subscription.location_id);

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        customer_id: customerId,
        location_id: finalLocationId,
        message: 'Subscription created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
