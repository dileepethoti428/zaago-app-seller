import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AgentWithCapacity {
  id: string;
  agent_id: string;
  name: string;
  location_id: number | null;
  max_capacity: number;
  orders_tomorrow: number;
  available_slots: number;
}

export const useDeliveryAgentsWithCapacity = (locationId: number | null) => {
  return useQuery({
    queryKey: ['delivery-agents-capacity', locationId],
    queryFn: async (): Promise<AgentWithCapacity[]> => {
      if (!locationId) return [];

      // Get tomorrow's date in YYYY-MM-DD format
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Fetch agents for this location
      const { data: agents, error: agentsError } = await supabase
        .from('delivery_agents')
        .select('id, agent_id, name, location_id, max_capacity')
        .eq('location_id', locationId)
        .eq('is_active', true);

      if (agentsError) throw agentsError;
      if (!agents || agents.length === 0) return [];

      // Fetch tomorrow's orders count per agent
      const agentIds = agents.map(a => a.id);
      const { data: ordersData, error: ordersError } = await supabase
        .from('daily_orders')
        .select('assigned_agent_id')
        .in('assigned_agent_id', agentIds)
        .eq('date', tomorrowStr);

      if (ordersError) throw ordersError;

      // Count orders per agent
      const orderCounts: Record<string, number> = {};
      (ordersData || []).forEach(order => {
        if (order.assigned_agent_id) {
          orderCounts[order.assigned_agent_id] = (orderCounts[order.assigned_agent_id] || 0) + 1;
        }
      });

      // Combine data
      return agents.map(agent => {
        const ordersTomorrow = orderCounts[agent.id] || 0;
        return {
          id: agent.id,
          agent_id: agent.agent_id,
          name: agent.name,
          location_id: agent.location_id,
          max_capacity: agent.max_capacity || 30,
          orders_tomorrow: ordersTomorrow,
          available_slots: (agent.max_capacity || 30) - ordersTomorrow,
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
