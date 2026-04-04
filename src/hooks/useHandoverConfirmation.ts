import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { toast } from 'sonner';
import type { HandoverDate } from './useSubscriptionHandover';

const IST_TIMEZONE = 'Asia/Kolkata';

function getISTDate(dateType: HandoverDate): string {
  const now = new Date();
  const istNow = toZonedTime(now, IST_TIMEZONE);
  const targetDate = dateType === 'tomorrow' ? addDays(istNow, 1) : istNow;
  return format(targetDate, 'yyyy-MM-dd');
}

export interface HandoverConfirmation {
  id: string;
  agentId: string;
  confirmedAt: Date;
}

export function useHandoverConfirmation(selectedDate: HandoverDate) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const handoverDate = getISTDate(selectedDate);

  // Fetch existing confirmations
  const {
    data: confirmations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['handover-confirmations', user?.id, handoverDate],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('agent_handover_confirmations')
        .select('id, agent_id, confirmed_at')
        .eq('seller_id', user.id)
        .eq('handover_date', handoverDate);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        agentId: row.agent_id,
        confirmedAt: new Date(row.confirmed_at),
      })) as HandoverConfirmation[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Real-time subscription for confirmations
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`handover-confirmations-realtime-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_handover_confirmations',
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['handover-confirmations', user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Confirm handover mutation
  const confirmHandover = useMutation({
    mutationFn: async (agentId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('agent_handover_confirmations')
        .insert({
          seller_id: user.id,
          agent_id: agentId,
          handover_date: handoverDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Handover confirmed successfully');
      queryClient.invalidateQueries({
        queryKey: ['handover-confirmations', user?.id, handoverDate],
      });
    },
    onError: (error) => {
      console.error('Failed to confirm handover:', error);
      toast.error('Failed to confirm handover');
    },
  });

  // Undo confirmation mutation
  const undoConfirmation = useMutation({
    mutationFn: async (agentId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('agent_handover_confirmations')
        .delete()
        .eq('seller_id', user.id)
        .eq('agent_id', agentId)
        .eq('handover_date', handoverDate);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Handover confirmation undone');
      queryClient.invalidateQueries({
        queryKey: ['handover-confirmations', user?.id, handoverDate],
      });
    },
    onError: (error) => {
      console.error('Failed to undo confirmation:', error);
      toast.error('Failed to undo confirmation');
    },
  });

  // Create a map for quick lookup
  const confirmationMap = new Map<string, HandoverConfirmation>();
  confirmations.forEach((c) => confirmationMap.set(c.agentId, c));

  const isConfirmed = (agentId: string) => confirmationMap.has(agentId);
  const getConfirmation = (agentId: string) => confirmationMap.get(agentId);
  const confirmedCount = confirmations.length;

  return {
    confirmations,
    confirmationMap,
    isConfirmed,
    getConfirmation,
    confirmedCount,
    isLoading,
    error: error as Error | null,
    refetch,
    confirmHandover: confirmHandover.mutate,
    undoConfirmation: undoConfirmation.mutate,
    isConfirming: confirmHandover.isPending,
    isUndoing: undoConfirmation.isPending,
  };
}
