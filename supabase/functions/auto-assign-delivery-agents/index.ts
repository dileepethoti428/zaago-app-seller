// ============================================================================
// AUTO-ASSIGN DELIVERY AGENTS
// ============================================================================
// ⚠️ SAFETY RULES (CRITICAL):
// - ALL assignments MUST respect location_id (agents only serve their location)
// - ALL assignments MUST respect max_capacity (never exceed agent limits)
// - This function is triggered by cron - sellers CANNOT override this
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyOrder {
  id: string;
  subscription_id: string;
  customer_id: string;
  location_id: number | null;
  quantity: number;
  date: string;
}

interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  deliveries_today: number;
  max_capacity: number;
  performance_score: number;
  is_online: boolean;
  is_active: boolean;
  location_id: number | null;
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
    console.log('⚠️ Safety: Enforcing location_id and max_capacity rules');

    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // Fetch all pending daily_orders for tomorrow that are unassigned
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('daily_orders')
      .select('id, subscription_id, customer_id, location_id, quantity, date')
      .eq('date', tomorrowDate)
      .eq('status', 'pending')
      .is('assigned_agent_id', null);

    if (ordersError) {
      console.error('Error fetching pending orders:', ordersError);
      throw ordersError;
    }

    console.log(`Found ${pendingOrders?.length || 0} pending daily orders for ${tomorrowDate}`);

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

    // Group orders by location_id for efficient processing
    const ordersByLocation = new Map<number, DailyOrder[]>();
    const ordersWithoutLocation: DailyOrder[] = [];

    for (const order of pendingOrders) {
      if (order.location_id) {
        const locationOrders = ordersByLocation.get(order.location_id) || [];
        locationOrders.push(order);
        ordersByLocation.set(order.location_id, locationOrders);
      } else {
        ordersWithoutLocation.push(order);
        console.warn(`Order ${order.id} has no location_id - skipping`);
      }
    }

    let assignedCount = 0;
    let failedCount = 0;
    let skippedNoLocation = ordersWithoutLocation.length;
    const errors: any[] = [];

    // Process orders location by location
    for (const [locationId, locationOrders] of ordersByLocation) {
      console.log(`Processing ${locationOrders.length} orders for location_id: ${locationId}`);

      // ⚠️ SAFETY: Fetch ONLY agents for this specific location with capacity info
      const { data: agents, error: agentsError } = await supabase
        .from('delivery_agents')
        .select('id, name, phone, deliveries_today, max_capacity, performance_score, is_online, is_active, location_id')
        .eq('is_active', true)
        .eq('is_online', true)
        .eq('location_id', locationId);

      if (agentsError) {
        console.error(`Error fetching agents for location ${locationId}:`, agentsError);
        failedCount += locationOrders.length;
        errors.push({ locationId, reason: 'Failed to fetch agents', error: agentsError.message });
        continue;
      }

      if (!agents || agents.length === 0) {
        console.log(`No active agents available for location ${locationId}`);
        failedCount += locationOrders.length;
        errors.push({ locationId, reason: 'No active agents for this location' });
        continue;
      }

      // ⚠️ SAFETY: Filter out agents who have reached max_capacity
      const availableAgents = agents.filter(agent => {
        const currentDeliveries = agent.deliveries_today || 0;
        const maxCapacity = agent.max_capacity || 30; // Default to 30 if not set
        const hasCapacity = currentDeliveries < maxCapacity;
        
        if (!hasCapacity) {
          console.log(`Agent ${agent.name} (${agent.id}) at max capacity: ${currentDeliveries}/${maxCapacity}`);
        }
        
        return hasCapacity;
      });

      console.log(`${availableAgents.length}/${agents.length} agents have capacity for location ${locationId}`);

      if (availableAgents.length === 0) {
        console.log(`All agents at capacity for location ${locationId}`);
        failedCount += locationOrders.length;
        errors.push({ locationId, reason: 'All agents at max capacity' });
        continue;
      }

      // Create a mutable copy of agents with their current capacity
      const agentCapacities = new Map(
        availableAgents.map(a => [a.id, {
          ...a,
          remainingCapacity: (a.max_capacity || 30) - (a.deliveries_today || 0)
        }])
      );

      // Assign each order to the best available agent
      for (const order of locationOrders) {
        try {
          // Get agents still with capacity (dynamically updated)
          const agentsWithCapacity = Array.from(agentCapacities.values())
            .filter(a => a.remainingCapacity > 0);

          if (agentsWithCapacity.length === 0) {
            console.log(`No more capacity available for order ${order.id}`);
            failedCount++;
            errors.push({ orderId: order.id, reason: 'No agents with remaining capacity' });
            continue;
          }

          // Score and rank agents
          const scoredAgents = agentsWithCapacity.map(agent => {
            // Workload score: prefer agents with more remaining capacity
            const workloadScore = agent.remainingCapacity * 2;
            // Performance score: higher is better
            const performanceScore = (agent.performance_score || 100) / 10;
            
            const totalScore = workloadScore + performanceScore;

            return {
              ...agent,
              score: totalScore
            };
          });

          // Sort by score (highest first)
          scoredAgents.sort((a, b) => b.score - a.score);

          const bestAgent = scoredAgents[0];

          console.log(`Assigning order ${order.id} to agent ${bestAgent.name} (capacity: ${bestAgent.remainingCapacity}, score: ${bestAgent.score.toFixed(1)})`);

          // Update daily_order with assigned agent
          const { error: updateError } = await supabase
            .from('daily_orders')
            .update({
              assigned_agent_id: bestAgent.id,
              status: 'assigned'
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
              message: `You have been assigned a subscription delivery for ${order.date}`,
              source_type: 'daily_order',
              source_id: order.id,
              metadata: {
                order_id: order.id,
                subscription_id: order.subscription_id,
                date: order.date
              }
            });

          if (notifError) {
            console.error(`Error creating notification for agent ${bestAgent.id}:`, notifError);
          }

          // Update agent's deliveries_today in database
          const { error: agentUpdateError } = await supabase
            .from('delivery_agents')
            .update({
              deliveries_today: (bestAgent.deliveries_today || 0) + 1
            })
            .eq('id', bestAgent.id);

          if (agentUpdateError) {
            console.error(`Error updating agent deliveries count:`, agentUpdateError);
          }

          // ⚠️ Update local capacity tracking
          const agentData = agentCapacities.get(bestAgent.id)!;
          agentData.remainingCapacity--;
          agentData.deliveries_today = (agentData.deliveries_today || 0) + 1;

          assignedCount++;

        } catch (orderError) {
          console.error(`Error processing order ${order.id}:`, orderError);
          failedCount++;
          errors.push({ orderId: order.id, reason: orderError.message });
        }
      }
    }

    console.log(`Assignment complete: ${assignedCount} assigned, ${failedCount} failed, ${skippedNoLocation} skipped (no location)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto-assignment completed',
        totalOrders: pendingOrders.length,
        assigned: assignedCount,
        failed: failedCount,
        skippedNoLocation,
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
