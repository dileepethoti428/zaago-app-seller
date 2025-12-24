import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function useMarkAgentAbsent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, agentUserId }: { agentId: string; agentUserId: string }) => {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Step 1: Set agent is_online = false
      const { error: agentError } = await supabase
        .from('delivery_agents')
        .update({ is_online: false })
        .eq('id', agentId);

      if (agentError) throw agentError;

      // Step 2: Unassign today's orders for this agent (using agent_id which is the user ID)
      const { error: ordersError } = await supabase
        .from('daily_orders')
        .update({ assigned_agent_id: null })
        .eq('assigned_agent_id', agentUserId)
        .eq('date', today);

      if (ordersError) throw ordersError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-capacity'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['daily-orders-counts'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['debug-daily-orders-today'] });
      queryClient.invalidateQueries({ queryKey: ['debug-daily-orders-tomorrow'] });
      toast({
        title: 'Agent Marked Absent',
        description: "Agent is now offline and today's orders have been unassigned.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to mark agent absent: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useMarkAgentOnline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId }: { agentId: string }) => {
      const { error } = await supabase
        .from('delivery_agents')
        .update({ is_online: true })
        .eq('id', agentId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-capacity'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['daily-orders-counts'] });
      toast({
        title: 'Agent Online',
        description: 'Agent is now available for deliveries.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update agent status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
