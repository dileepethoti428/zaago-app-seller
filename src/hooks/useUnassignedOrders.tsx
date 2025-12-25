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
    queryKey: ['unassigned-orders', user?.id, locationId, dateType],
    queryFn: async (): Promise<UnassignedOrder[]> => {
      if (!user?.id || !locationId) return [];

      const targetDate = dateType === 'today' ? new Date() : addDays(new Date(), 1);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      // Use RPC to get seller-specific unassigned orders
      const { data: orders, error: ordersError } = await supabase.rpc('get_seller_unassigned_orders' as any, {
        p_seller_user_id: user.id,
        p_date: dateStr
      });

      if (ordersError) {
        console.error('Error fetching unassigned orders:', ordersError);
        throw ordersError;
      }

      if (!orders || orders.length === 0) return [];

      // Check if there are any agents in this location
      const { data: agents, error: agentsError } = await supabase
        .from('delivery_agents')
        .select('id, max_capacity')
        .eq('location_id', locationId)
        .eq('is_active', true);

      if (agentsError) throw agentsError;

      // Count orders assigned to each agent for the target date (seller-specific)
      const { data: agentCounts, error: countsError } = await supabase.rpc('get_seller_agent_order_counts' as any, {
        p_seller_user_id: user.id,
        p_date: dateStr,
        p_location_id: locationId
      });

      if (countsError) {
        console.error('Error fetching agent order counts:', countsError);
        throw countsError;
      }

      // Calculate if all agents are at capacity
      const agentOrderCounts: Record<string, number> = {};
      (agentCounts || []).forEach((row: { agent_id: string; order_count: number }) => {
        agentOrderCounts[row.agent_id] = row.order_count;
      });

      const hasAgents = agents && agents.length > 0;
      const allAtCapacity = hasAgents && agents.every((agent) => {
        const orderCount = agentOrderCounts[agent.id] || 0;
        return orderCount >= agent.max_capacity;
      });

      // Map orders with reason
      return (orders as any[]).map((order): UnassignedOrder => {
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
          customer_name: order.customer_name || 'Unknown Customer',
          customer_id: order.customer_id,
          product_name: order.product_name || 'Unknown Product',
          product_id: order.product_id || '',
          subscription_id: order.subscription_id,
          reason,
        };
      });
    },
    enabled: !!user?.id && !!locationId,
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
