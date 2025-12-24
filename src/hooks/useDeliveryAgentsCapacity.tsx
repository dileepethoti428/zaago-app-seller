import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

export const useDeliveryAgentsWithCapacity = (locationId: number | null) => {
  return useQuery({
    queryKey: ['delivery-agents-capacity', locationId],
    queryFn: async (): Promise<AgentWithCapacity[]> => {
      if (!locationId) return [];

      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

      // Fetch agents for this location
      const { data: agents, error: agentsError } = await supabase
        .from('delivery_agents')
        .select('id, agent_id, name, location_id, max_capacity, is_online')
        .eq('location_id', locationId)
        .eq('is_active', true);

      if (agentsError) throw agentsError;
      if (!agents || agents.length === 0) return [];

      // Get agent user IDs for daily_orders query
      const agentUserIds = agents.map(a => a.agent_id);

      // Fetch tomorrow's orders count per agent
      const { data: tomorrowOrdersData, error: tomorrowError } = await supabase
        .from('daily_orders')
        .select('assigned_agent_id')
        .in('assigned_agent_id', agentUserIds)
        .eq('date', tomorrowStr);

      if (tomorrowError) throw tomorrowError;

      // Fetch today's orders count per agent
      const { data: todayOrdersData, error: todayError } = await supabase
        .from('daily_orders')
        .select('assigned_agent_id')
        .in('assigned_agent_id', agentUserIds)
        .eq('date', today);

      if (todayError) throw todayError;

      // Count orders per agent for tomorrow
      const tomorrowCounts: Record<string, number> = {};
      (tomorrowOrdersData || []).forEach(order => {
        if (order.assigned_agent_id) {
          tomorrowCounts[order.assigned_agent_id] = (tomorrowCounts[order.assigned_agent_id] || 0) + 1;
        }
      });

      // Count orders per agent for today
      const todayCounts: Record<string, number> = {};
      (todayOrdersData || []).forEach(order => {
        if (order.assigned_agent_id) {
          todayCounts[order.assigned_agent_id] = (todayCounts[order.assigned_agent_id] || 0) + 1;
        }
      });

      // Combine data
      return agents.map(agent => {
        const ordersTomorrow = tomorrowCounts[agent.agent_id] || 0;
        const ordersToday = todayCounts[agent.agent_id] || 0;
        return {
          id: agent.id,
          agent_id: agent.agent_id,
          name: agent.name,
          location_id: agent.location_id,
          max_capacity: agent.max_capacity || 30,
          orders_tomorrow: ordersTomorrow,
          orders_today: ordersToday,
          available_slots: (agent.max_capacity || 30) - ordersTomorrow,
          is_online: agent.is_online ?? true,
        };
      });
    },
    enabled: !!locationId,
  });
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
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-capacity'] });
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
