import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Order {
  id: string;
  seller_id: string;
  delivery_address: any;
  subscription_id: string;
}

interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  deliveries_today: number;
  performance_score: number;
  is_online: boolean;
  is_active: boolean;
}

// Calculate distance using Haversine formula (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting auto-assignment of delivery agents...');

    // Fetch all pending subscription orders created in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, seller_id, delivery_address, subscription_id')
      .eq('status', 'pending')
      .not('subscription_id', 'is', null)
      .is('assigned_agent_id', null)
      .gte('created_at', thirtyMinutesAgo);

    if (ordersError) {
      console.error('Error fetching pending orders:', ordersError);
      throw ordersError;
    }

    console.log(`Found ${pendingOrders?.length || 0} pending subscription orders`);

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending orders to assign',
          assigned: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active and online delivery agents
    const { data: agents, error: agentsError } = await supabase
      .from('delivery_agents')
      .select('id, name, phone, deliveries_today, performance_score, is_online, is_active')
      .eq('is_active', true)
      .eq('is_online', true);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      throw agentsError;
    }

    if (!agents || agents.length === 0) {
      console.log('No active agents available');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active agents available',
          assigned: 0,
          pending: pendingOrders.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${agents.length} active agents`);

    let assignedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Assign each order to the best available agent
    for (const order of pendingOrders) {
      try {
        // Get seller location for this order
        const { data: seller, error: sellerError } = await supabase
          .from('public_sellers')
          .select('location')
          .eq('id', order.seller_id)
          .single();

        if (sellerError || !seller?.location) {
          console.error(`No location found for seller ${order.seller_id}`);
          failedCount++;
          errors.push({ orderId: order.id, reason: 'Seller location not found' });
          continue;
        }

        const sellerLat = seller.location.coordinates[1];
        const sellerLon = seller.location.coordinates[0];

        // Score and rank agents
        const scoredAgents = agents.map(agent => {
          // For now, we'll use a simple scoring without exact location
          // In production, you'd calculate distance to seller location
          const workloadScore = Math.max(0, 10 - (agent.deliveries_today || 0));
          const performanceScore = (agent.performance_score || 100) / 10;
          
          // Simple scoring: lower deliveries + higher performance = better
          const totalScore = workloadScore + performanceScore;

          return {
            ...agent,
            score: totalScore
          };
        });

        // Sort by score (highest first)
        scoredAgents.sort((a, b) => b.score - a.score);

        // Select best agent
        const bestAgent = scoredAgents[0];

        if (!bestAgent) {
          console.error(`No suitable agent found for order ${order.id}`);
          failedCount++;
          errors.push({ orderId: order.id, reason: 'No suitable agent found' });
          continue;
        }

        console.log(`Assigning order ${order.id} to agent ${bestAgent.name} (score: ${bestAgent.score})`);

        // Update order with assigned agent
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            assigned_agent_id: bestAgent.id,
            status: 'assigned',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`Error updating order ${order.id}:`, updateError);
          failedCount++;
          errors.push({ orderId: order.id, reason: updateError.message });
          continue;
        }

        // Create notification for agent
        const { error: notifError } = await supabase
          .from('agent_notifications')
          .insert({
            agent_id: bestAgent.id,
            type: 'new_assignment',
            title: 'New Delivery Assignment',
            message: `You have been assigned a new subscription delivery order`,
            source_type: 'order',
            source_id: order.id,
            metadata: {
              order_id: order.id,
              subscription_id: order.subscription_id
            }
          });

        if (notifError) {
          console.error(`Error creating notification for agent ${bestAgent.id}:`, notifError);
        }

        // Increment agent's deliveries_today
        const { error: agentUpdateError } = await supabase
          .from('delivery_agents')
          .update({
            deliveries_today: (bestAgent.deliveries_today || 0) + 1
          })
          .eq('id', bestAgent.id);

        if (agentUpdateError) {
          console.error(`Error updating agent deliveries count:`, agentUpdateError);
        }

        assignedCount++;

      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        failedCount++;
        errors.push({ orderId: order.id, reason: orderError.message });
      }
    }

    console.log(`Assignment complete: ${assignedCount} assigned, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto-assignment completed',
        totalOrders: pendingOrders.length,
        assigned: assignedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Critical error in auto-assignment:', error);
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
