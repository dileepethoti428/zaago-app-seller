import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getCurrentISTTime, getTomorrowDateIST } from '@/utils/timeZone';
import { useAuth } from '@/context/AuthContext';

interface AgentWithCapacity {
  id: string;
  agent_id: string;
  name: string;
  location_id: number | null;
  max_capacity: number;
  orders_tomorrow: number;
  orders_today: number;
  available_slots: number;
  is_online: boolean;
}

// Seller-specific order counts using RPC
export const useSellerAgentOrderCounts = (
  sellerUserId: string | undefined,
  locationId: number | null,
  dateStr: string
) => {
  return useQuery({
    queryKey: ['seller-agent-order-counts', sellerUserId, locationId, dateStr],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!sellerUserId || !locationId) return {};

      const { data, error } = await supabase.rpc('get_seller_agent_order_counts' as any, {
        p_seller_user_id: sellerUserId,
        p_date: dateStr,
        p_location_id: locationId
      });

      if (error) {
        console.error('Error fetching seller agent order counts:', error);
        throw error;
      }

      // Convert array to record
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { agent_id: string; order_count: number }) => {
        counts[row.agent_id] = row.order_count;
      });

      return counts;
    },
    enabled: !!sellerUserId && !!locationId && !!dateStr,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useDeliveryAgentsWithCapacity = (selectedLocationId: number | null) => {
  const { user } = useAuth();
  
  // Compute date strings using IST
  const todayIST = getCurrentISTTime();
  const tomorrowIST = getTomorrowDateIST();
  const todayStr = format(todayIST, 'yyyy-MM-dd');
  const tomorrowStr = format(tomorrowIST, 'yyyy-MM-dd');

  // Seller-specific order counts using RPC
  const { data: todayCounts, isLoading: todayLoading } = useSellerAgentOrderCounts(
    user?.id,
    selectedLocationId,
    todayStr
  );
  const { data: tomorrowCounts, isLoading: tomorrowLoading } = useSellerAgentOrderCounts(
    user?.id,
    selectedLocationId,
    tomorrowStr
  );

  // Fetch agents list (all agents at location - this is correct)
  const { data: agents, isLoading: agentsLoading, refetch } = useQuery({
    queryKey: ['delivery-agents-list', selectedLocationId],
    queryFn: async () => {
      if (!selectedLocationId) return [];

      const { data, error } = await supabase
        .from('delivery_agents')
        .select('id, agent_id, name, location_id, max_capacity, is_online')
        .eq('location_id', selectedLocationId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLocationId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Use fallback empty objects so merge always works - missing entry = 0 orders
  const safeTodayCounts = todayCounts ?? {};
  const safeTomorrowCounts = tomorrowCounts ?? {};

  // Only block on agents loading - counts update reactively
  const isLoading = agentsLoading;
  
  const agentsWithCapacity: AgentWithCapacity[] | undefined = 
    agents && agents.length > 0
      ? agents.map(agent => {
          // Use agent_id (user UUID) to look up counts
          // These counts are now seller-specific (only this seller's orders)
          const ordersToday = safeTodayCounts[agent.agent_id] ?? 0;
          const ordersTomorrow = safeTomorrowCounts[agent.agent_id] ?? 0;
          const maxCapacity = agent.max_capacity || 30;

          return {
            id: agent.id,
            agent_id: agent.agent_id,
            name: agent.name,
            location_id: agent.location_id,
            max_capacity: maxCapacity,
            orders_tomorrow: ordersTomorrow,
            orders_today: ordersToday,
            available_slots: maxCapacity - ordersToday,
            is_online: agent.is_online ?? true,
          };
        })
      : undefined;

  return {
    data: agentsWithCapacity,
    isLoading,
    refetch,
  };
};

export const useUpdateAgentCapacity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, newCapacity }: { agentId: string; newCapacity: number }) => {
      const { error } = await supabase
        .from('delivery_agents')
        .update({ max_capacity: newCapacity })
        .eq('id', agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-capacity'] });
      queryClient.invalidateQueries({ queryKey: ['seller-agent-order-counts'] });
      toast({
        title: 'Capacity Updated',
        description: 'Agent capacity has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update capacity: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useSellerLocationId = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['seller-location-id', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('sellers')
        .select('location_id')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.location_id || null;
    },
    enabled: !!userId,
  });
};
