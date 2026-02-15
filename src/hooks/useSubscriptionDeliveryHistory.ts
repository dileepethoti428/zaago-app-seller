import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { getCurrentISTTime } from '@/utils/timeZone';

export interface DeliveryDayStatus {
  date: string;
  status: string;
  dailyOrderId: string | null;
  hasCompensation: boolean;
  compensationStatus: string | null;
}

export const useSubscriptionDeliveryHistory = (subscriptionId: string | null) => {
  return useQuery({
    queryKey: ['subscription-delivery-history', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return {};

      const today = getCurrentISTTime();
      const thirtyDaysAgo = format(subDays(today, 30), 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch daily_orders for last 30 days
      const { data: dailyOrders, error: ordersError } = await supabase
        .from('daily_orders')
        .select('id, date, status')
        .eq('subscription_id', subscriptionId)
        .gte('date', thirtyDaysAgo)
        .lte('date', todayStr)
        .order('date', { ascending: true });

      if (ordersError) throw ordersError;

      // Fetch compensations for this subscription
      const { data: compensations, error: compError } = await supabase
        .from('vacation_compensations')
        .select('original_vacation_date, status')
        .eq('subscription_id', subscriptionId)
        .gte('original_vacation_date', thirtyDaysAgo);

      if (compError) throw compError;

      // Build compensation lookup
      const compMap = new Map<string, string>();
      (compensations || []).forEach(c => {
        compMap.set(c.original_vacation_date, c.status || 'pending');
      });

      // Build date -> status map
      const history: Record<string, DeliveryDayStatus> = {};
      (dailyOrders || []).forEach(order => {
        history[order.date] = {
          date: order.date,
          status: order.status,
          dailyOrderId: order.id,
          hasCompensation: compMap.has(order.date),
          compensationStatus: compMap.get(order.date) || null,
        };
      });

      return history;
    },
    enabled: !!subscriptionId,
  });
};

export const useSubscriptionMissedCounts = (subscriptionIds: string[]) => {
  return useQuery({
    queryKey: ['subscription-missed-counts', subscriptionIds.sort().join(',')],
    queryFn: async () => {
      if (!subscriptionIds.length) return {};

      const today = getCurrentISTTime();
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch all past pending daily_orders for these subscriptions
      const { data: missedOrders, error } = await supabase
        .from('daily_orders')
        .select('subscription_id, id, date')
        .in('subscription_id', subscriptionIds)
        .lt('date', todayStr)
        .in('status', ['pending', 'failed', 'undelivered', 'cancelled_agent', 'delivery_failed']);

      if (error) throw error;

      // Fetch existing compensations
      const { data: compensations, error: compError } = await supabase
        .from('vacation_compensations')
        .select('subscription_id, original_vacation_date')
        .in('subscription_id', subscriptionIds);

      if (compError) throw compError;

      // Build set of already-compensated (subscription_id + date)
      const compensatedSet = new Set<string>();
      (compensations || []).forEach(c => {
        compensatedSet.add(`${c.subscription_id}:${c.original_vacation_date}`);
      });

      // Count uncompensated missed orders per subscription
      const counts: Record<string, number> = {};
      (missedOrders || []).forEach(order => {
        const key = `${order.subscription_id}:${order.date}`;
        if (!compensatedSet.has(key)) {
          counts[order.subscription_id] = (counts[order.subscription_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: subscriptionIds.length > 0,
  });
};
