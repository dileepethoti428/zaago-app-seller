import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { subDays, subMonths, startOfDay } from 'date-fns';

export type TimePeriod = 'all' | 'today' | '1week' | '1month' | '6months';
export type StatusFilter = 'all' | 'pending' | 'settled';

export interface AgentSettlement {
  agent_id: string;
  agent_name: string;
  profile_image: string | null;
  phone: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  is_online: boolean;
  joined_at: string | null;
  total_deliveries: number;
  total_amount: number;
  pending_count: number;
  settled_count: number;
  total_count: number;
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

export function useCodSettlements(period: TimePeriod, statusFilter: StatusFilter, search: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cod-settlements', user?.id, period, statusFilter, search],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('cod_settlements')
        .select('id, order_id, agent_id, amount, status, settled_at, created_at')
        .eq('seller_id', user!.id);

      const dateFrom = getDateFilter(period);
      if (dateFrom) {
        q = q.gte('created_at', dateFrom.toISOString());
      }

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }

      const { data: settlements, error } = await q;
      if (error) throw error;

      // Get unique agent ids
      const agentIds = [...new Set((settlements || []).map(s => s.agent_id))];
      if (agentIds.length === 0) return [] as AgentSettlement[];

      // Fetch agent details
      const { data: agents, error: agentError } = await supabase
        .from('delivery_agents')
        .select('id, name, profile_image, phone, vehicle_type, vehicle_number, is_online, created_at, total_deliveries')
        .in('id', agentIds);
      if (agentError) throw agentError;

      const agentMap = new Map((agents || []).map(a => [a.id, a]));

      // Group by agent
      const grouped = new Map<string, AgentSettlement>();
      for (const s of settlements || []) {
        const agent = agentMap.get(s.agent_id);
        if (!agent) continue;

        if (!grouped.has(s.agent_id)) {
          grouped.set(s.agent_id, {
            agent_id: s.agent_id,
            agent_name: agent.name,
            profile_image: agent.profile_image,
            phone: (agent as any).phone ?? null,
            vehicle_type: (agent as any).vehicle_type ?? null,
            vehicle_number: (agent as any).vehicle_number ?? null,
            is_online: Boolean((agent as any).is_online),
            joined_at: (agent as any).created_at ?? null,
            total_deliveries: Number((agent as any).total_deliveries ?? 0),
            total_amount: 0,
            pending_count: 0,
            settled_count: 0,
            total_count: 0,
          });
        }
        const g = grouped.get(s.agent_id)!;
        g.total_amount += Number(s.amount);
        g.total_count += 1;
        if (s.status === 'pending') g.pending_count += 1;
        if (s.status === 'settled') g.settled_count += 1;
      }

      let results = Array.from(grouped.values());

      // Search filter
      if (search.trim()) {
        const term = search.toLowerCase();
        results = results.filter(r => r.agent_name.toLowerCase().includes(term));
      }

      return results;
    },
  });

  const settleMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const dateFrom = getDateFilter(period);
      let q = supabase
        .from('cod_settlements')
        .update({ status: 'settled', settled_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
        .eq('seller_id', user!.id)
        .eq('agent_id', agentId)
        .eq('status', 'pending');

      if (dateFrom) {
        q = q.gte('created_at', dateFrom.toISOString());
      }

      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settlements marked as settled');
      queryClient.invalidateQueries({ queryKey: ['cod-settlements'] });
    },
    onError: (err: any) => {
      toast.error('Failed to settle: ' + err.message);
    },
  });

  return { ...query, settle: settleMutation.mutateAsync, isSettling: settleMutation.isPending };
}
