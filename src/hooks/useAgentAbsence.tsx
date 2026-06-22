import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function useMarkAgentAbsent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      agentId,
      agentUserId,
      replacementAgentUserId,
    }: {
      agentId: string;
      agentUserId: string;
      replacementAgentUserId?: string | null;
    }) => {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Step 1: Set agent is_online = false
      const { error: agentError } = await supabase
        .from('delivery_agents')
        .update({ is_online: false })
        .eq('id', agentId);

      if (agentError) throw agentError;

      // Step 2: Either transfer today's orders to replacement, or unassign them
      const { data: updated, error: ordersError } = await supabase
        .from('daily_orders')
        .update({ assigned_agent_id: replacementAgentUserId ?? null })
        .eq('assigned_agent_id', agentUserId)
        .eq('date', today)
        .select('id');

      if (ordersError) throw ordersError;

      return { success: true, transferred: updated?.length ?? 0, replacementAgentUserId: replacementAgentUserId ?? null };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-capacity'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['daily-orders-counts'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['debug-daily-orders-today'] });
      queryClient.invalidateQueries({ queryKey: ['debug-daily-orders-tomorrow'] });
      // GPS-based queries
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-near-seller'] });
      queryClient.invalidateQueries({ queryKey: ['seller-agent-order-counts-gps'] });
      toast({
        title: 'Agent Marked Absent',
        description: result.replacementAgentUserId
          ? `Agent is offline. ${result.transferred} order${result.transferred === 1 ? '' : 's'} transferred to replacement partner.`
          : "Agent is now offline and today's orders have been unassigned.",
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
      // GPS-based queries
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-near-seller'] });
      queryClient.invalidateQueries({ queryKey: ['seller-agent-order-counts-gps'] });
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
