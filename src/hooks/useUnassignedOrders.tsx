import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { useSellerLocationId } from './useDeliveryAgentsCapacity';
import { useAuth } from '@/context/AuthContext';

export interface UnassignedOrder {
  id: string;
  date: string;
  quantity: number;
  status: string;
  location_id: number | null;
  customer_name: string;
  customer_id: string;
  product_name: string;
  product_id: string;
  subscription_id: string;
  reason: 'no_agents' | 'all_at_capacity';
}

export type DateType = 'today' | 'tomorrow';

export function useUnassignedOrders(dateType: DateType = 'tomorrow') {
  const { user } = useAuth();
  const { data: locationId } = useSellerLocationId(user?.id);

  return useQuery({
    queryKey: ['unassigned-orders', locationId, dateType],
    queryFn: async (): Promise<UnassignedOrder[]> => {
      if (!locationId) return [];

      const targetDate = dateType === 'today' ? new Date() : addDays(new Date(), 1);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      // Fetch unassigned orders for the target date
      const { data: orders, error: ordersError } = await supabase
        .from('daily_orders')
        .select(`
          id,
          date,
          quantity,
          status,
          location_id,
          customer_id,
          subscription_id,
          customers!daily_orders_customer_id_fkey(id, full_name),
          subscriptions!daily_orders_subscription_id_fkey(
            id,
            product_id,
            products!subscriptions_product_id_fkey(id, name)
          )
        `)
        .eq('date', dateStr)
        .eq('location_id', locationId)
        .is('assigned_agent_id', null);

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      // Check if there are any agents in this location
      const { data: agents, error: agentsError } = await supabase
        .from('delivery_agents')
        .select('id, max_capacity')
        .eq('location_id', locationId)
        .eq('is_active', true);

      if (agentsError) throw agentsError;

      // Count orders assigned to each agent for the target date
      const { data: assignedOrders, error: assignedError } = await supabase
        .from('daily_orders')
        .select('assigned_agent_id')
        .eq('date', dateStr)
        .eq('location_id', locationId)
        .not('assigned_agent_id', 'is', null);

      if (assignedError) throw assignedError;

      // Calculate if all agents are at capacity
      const agentOrderCounts: Record<string, number> = {};
      assignedOrders?.forEach((order) => {
        if (order.assigned_agent_id) {
          agentOrderCounts[order.assigned_agent_id] = (agentOrderCounts[order.assigned_agent_id] || 0) + 1;
        }
      });

      const hasAgents = agents && agents.length > 0;
      const allAtCapacity = hasAgents && agents.every((agent) => {
        const orderCount = agentOrderCounts[agent.id] || 0;
        return orderCount >= agent.max_capacity;
      });

      // Map orders with reason
      return orders.map((order): UnassignedOrder => {
        const customer = order.customers as { id: string; full_name: string } | null;
        const subscription = order.subscriptions as { 
          id: string; 
          product_id: string; 
          products: { id: string; name: string } | null 
        } | null;

        let reason: 'no_agents' | 'all_at_capacity' = 'no_agents';
        if (hasAgents) {
          reason = allAtCapacity ? 'all_at_capacity' : 'no_agents';
        }

        return {
          id: order.id,
          date: order.date,
          quantity: order.quantity,
          status: order.status,
          location_id: order.location_id,
          customer_name: customer?.full_name || 'Unknown Customer',
          customer_id: order.customer_id,
          product_name: subscription?.products?.name || 'Unknown Product',
          product_id: subscription?.product_id || '',
          subscription_id: order.subscription_id,
          reason,
        };
      });
    },
    enabled: !!locationId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
