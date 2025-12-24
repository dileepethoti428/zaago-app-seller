import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getCurrentISTTime, getTomorrowDateIST } from '@/utils/timeZone';

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

// Source-of-truth hook for grouped daily order counts
export const useDailyOrdersCounts = (selectedLocationId: number | null, dateStr: string) => {
  return useQuery({
    queryKey: ['daily-orders-counts', selectedLocationId, dateStr],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!selectedLocationId) return {};

      const { data, error } = await supabase
        .from('daily_orders')
        .select('assigned_agent_id')
        .eq('date', dateStr)
        .eq('location_id', selectedLocationId)
        .not('assigned_agent_id', 'is', null);

      if (error) throw error;

      // Group by assigned_agent_id - this is the ONLY place counts are computed
      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        if (row.assigned_agent_id) {
          counts[row.assigned_agent_id] = (counts[row.assigned_agent_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!selectedLocationId && !!dateStr,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useDeliveryAgentsWithCapacity = (selectedLocationId: number | null) => {
  // Compute date strings using IST
  const todayIST = getCurrentISTTime();
  const tomorrowIST = getTomorrowDateIST();
  const todayStr = format(todayIST, 'yyyy-MM-dd');
  const tomorrowStr = format(tomorrowIST, 'yyyy-MM-dd');

  // Source-of-truth counts from separate queries
  const { data: todayCounts, isLoading: todayLoading } = useDailyOrdersCounts(selectedLocationId, todayStr);
  const { data: tomorrowCounts, isLoading: tomorrowLoading } = useDailyOrdersCounts(selectedLocationId, tomorrowStr);

  // Fetch agents list
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

  // Combine agents with counts ONLY when all data is loaded
  const isLoading = agentsLoading || todayLoading || tomorrowLoading;
  
  const agentsWithCapacity: AgentWithCapacity[] | undefined = 
    !isLoading && agents && todayCounts && tomorrowCounts
      ? agents.map(agent => {
          // Use agent_id (user UUID) to look up counts - this is what daily_orders.assigned_agent_id references
          const ordersToday = todayCounts[agent.agent_id] ?? 0;
          const ordersTomorrow = tomorrowCounts[agent.agent_id] ?? 0;
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
      queryClient.invalidateQueries({ queryKey: ['daily-orders-counts'] });
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
