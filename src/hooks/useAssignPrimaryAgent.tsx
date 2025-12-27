// ============================================================================
// ASSIGN PRIMARY AGENT HOOK
// ============================================================================
// Agent assignment can be changed or removed when needed (e.g., agent quits)
// Uses RPC function to bypass trigger protection
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AssignAgentParams {
  subscriptionId: string;
  agentId: string;
}

/**
 * Hook to assign or change primary delivery agent for a subscription.
 * Uses RPC function to bypass the trigger that normally blocks agent changes.
 */
export const useAssignPrimaryAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriptionId, agentId }: AssignAgentParams) => {
      const { data, error } = await supabase.rpc('seller_set_subscription_agent', {
        p_subscription_id: subscriptionId,
        p_agent_id: agentId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      toast({
        title: 'Agent Assigned',
        description: 'Delivery agent has been assigned successfully.',
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

/**
 * Hook to remove primary delivery agent from a subscription.
 * Use when an agent quits or needs to be unassigned.
 * Uses RPC function to bypass the trigger that normally blocks agent changes.
 */
export const useRemovePrimaryAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.rpc('seller_set_subscription_agent', {
        p_subscription_id: subscriptionId,
        p_agent_id: null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      toast({
        title: 'Agent Removed',
        description: 'Delivery agent has been removed from this subscription.',
      });
    },
    onError: (error) => {
      console.error('Error removing agent:', error);
      toast({
        title: 'Removal Failed',
        description: 'Failed to remove delivery agent. Please try again.',
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
