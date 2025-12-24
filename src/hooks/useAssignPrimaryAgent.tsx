import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AssignAgentParams {
  subscriptionId: string;
  agentId: string;
}

export const useAssignPrimaryAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriptionId, agentId }: AssignAgentParams) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          primary_agent_id: agentId,
          last_assigned_agent_id: agentId
        })
        .eq('id', subscriptionId);

      if (error) throw error;
      return { subscriptionId, agentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      toast({
        title: 'Agent Assigned',
        description: 'Primary delivery agent has been assigned successfully.',
      });
    },
    onError: (error) => {
      console.error('Error assigning agent:', error);
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign delivery agent. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeliveryAgentsByLocation = (locationId: number | null) => {
  return {
    queryKey: ['delivery-agents-by-location', locationId],
    queryFn: async () => {
      if (!locationId) return [];

      const { data, error } = await supabase
        .from('delivery_agents')
        .select('id, name, location_id')
        .eq('location_id', locationId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId,
  };
};
