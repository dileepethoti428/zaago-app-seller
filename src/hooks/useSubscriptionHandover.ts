import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export type HandoverDate = 'today' | 'tomorrow';

export interface HandoverProduct {
  productId: string;
  productName: string;
  productUnit: string;
  productImage: string | null;
  totalQuantity: number;
  deliveryTimeSlot: string | null;
}

export interface HandoverAgent {
  agentId: string;
  agentName: string;
  agentPhone: string | null;
  agentProfileImage: string | null;
  totalOrders: number;
  products: HandoverProduct[];
}

interface RawHandoverData {
  agent_id: string;
  agent_name: string;
  agent_phone: string | null;
  agent_profile_image: string | null;
  total_orders: number;
  product_id: string;
  product_name: string;
  product_unit: string;
  product_image: string | null;
  total_quantity: number;
  delivery_time_slot: string | null;
}

const IST_TIMEZONE = 'Asia/Kolkata';

function getISTDate(dateType: HandoverDate): string {
  const now = new Date();
  const istNow = toZonedTime(now, IST_TIMEZONE);
  const targetDate = dateType === 'tomorrow' ? addDays(istNow, 1) : istNow;
  return format(targetDate, 'yyyy-MM-dd');
}

function isEarlyMorningSlot(timeSlot: string | null): boolean {
  if (!timeSlot) return false;
  // Check if time slot contains early morning times (before 7:00 AM)
  const earlyPatterns = ['5:', '6:', '05:', '06:', '4:', '04:'];
  return earlyPatterns.some(pattern => timeSlot.includes(pattern));
}

function groupDataByAgent(data: RawHandoverData[]): HandoverAgent[] {
  const agentMap = new Map<string, HandoverAgent>();

  for (const row of data) {
    if (!agentMap.has(row.agent_id)) {
      agentMap.set(row.agent_id, {
        agentId: row.agent_id,
        agentName: row.agent_name,
        agentPhone: row.agent_phone,
        agentProfileImage: row.agent_profile_image,
        totalOrders: 0,
        products: [],
      });
    }

    const agent = agentMap.get(row.agent_id)!;
    agent.totalOrders += row.total_orders;
    agent.products.push({
      productId: row.product_id,
      productName: row.product_name,
      productUnit: row.product_unit || 'units',
      productImage: row.product_image,
      totalQuantity: row.total_quantity,
      deliveryTimeSlot: row.delivery_time_slot,
    });
  }

  // Sort agents by name
  return Array.from(agentMap.values()).sort((a, b) => 
    a.agentName.localeCompare(b.agentName)
  );
}

export function useSubscriptionHandover(selectedDate: HandoverDate) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const handoverDate = getISTDate(selectedDate);

  const {
    data: rawData,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['subscription-handover', user?.id, handoverDate],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_seller_subscription_handover_data', {
        seller_user_id: user.id,
        handover_date: handoverDate,
      });

      if (error) throw error;
      return (data as RawHandoverData[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });

  // Set up realtime subscription for live updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('handover-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_orders' },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['subscription-handover', user.id] 
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['subscription-handover', user.id] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Group data by agent
  const agents = useMemo(() => {
    if (!rawData) return [];
    return groupDataByAgent(rawData);
  }, [rawData]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalAgents = agents.length;
    const totalOrders = agents.reduce((sum, agent) => sum + agent.totalOrders, 0);
    const hasEarlyMorning = agents.some(agent =>
      agent.products.some(product => isEarlyMorningSlot(product.deliveryTimeSlot))
    );

    return {
      totalAgents,
      totalOrders,
      hasEarlyMorning,
    };
  }, [agents]);

  return {
    agents,
    summary,
    isLoading,
    error: error as Error | null,
    refetch,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}
