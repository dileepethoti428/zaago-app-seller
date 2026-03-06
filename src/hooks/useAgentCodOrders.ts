import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { subDays, subMonths, startOfDay } from 'date-fns';
import type { TimePeriod, StatusFilter } from './useCodSettlements';

export interface AgentCodOrder {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
  settled_at: string | null;
}

function getDateFilter(period: TimePeriod): Date | null {
  const now = new Date();
  switch (period) {
    case 'today': return startOfDay(now);
    case '1week': return subDays(now, 7);
    case '1month': return subMonths(now, 1);
    case '6months': return subMonths(now, 6);
    default: return null;
  }
}

export function useAgentCodOrders(
  agentId: string | null,
  period: TimePeriod,
  statusFilter: StatusFilter
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['agent-cod-orders', agentId, user?.id, period, statusFilter],
    enabled: !!user?.id && !!agentId,
    queryFn: async () => {
      let q = supabase
        .from('cod_settlements')
        .select('id, order_id, amount, status, created_at, settled_at')
        .eq('seller_id', user!.id)
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false });

      const dateFrom = getDateFilter(period);
      if (dateFrom) {
        q = q.gte('created_at', dateFrom.toISOString());
      }

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AgentCodOrder[];
    },
  });

  const settleMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      const { error } = await supabase
        .from('cod_settlements')
        .update({ 
          status: 'settled', 
          settled_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        } as any)
        .eq('id', settlementId)
        .eq('seller_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Order settled successfully');
      queryClient.invalidateQueries({ queryKey: ['agent-cod-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cod-settlements'] });
    },
    onError: (err: any) => {
      toast.error('Failed to settle: ' + err.message);
    },
  });

  return {
    ...query,
    settleOne: settleMutation.mutateAsync,
    isSettlingOne: settleMutation.isPending,
  };
}
