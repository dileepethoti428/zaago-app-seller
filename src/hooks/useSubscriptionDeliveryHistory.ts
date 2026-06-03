import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, addDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { getCurrentISTTime } from '@/utils/timeZone';

export interface DeliveryDayStatus {
  date: string;
  status: string;
  dailyOrderId: string | null;
  hasCompensation: boolean;
  compensationStatus: string | null;
}

interface SubscriptionSchedule {
  start_date: string | null;
  end_date: string | null;
  subscription_type: string | null;
  delivery_days: string[] | null;
  status: string | null;
}

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const isScheduledDay = (date: Date, sub: SubscriptionSchedule): boolean => {
  if (!sub.start_date) return false;
  const start = parseISO(sub.start_date);
  if (date < start) return false;
  if (sub.end_date) {
    const end = parseISO(sub.end_date);
    if (date > end) return false;
  }

  const type = (sub.subscription_type || '').toLowerCase();
  if (type === 'everyday' || type === 'daily') return true;

  if (type === 'alternative' || type === 'alternate' || type === 'alternate_day') {
    const diff = differenceInCalendarDays(date, start);
    return diff >= 0 && diff % 2 === 0;
  }

  if (type === 'custom' || type === 'weekly') {
    const days = (sub.delivery_days || []).map((d) => String(d).toLowerCase());
    if (!days.length) return false;
    const weekday = WEEKDAY_KEYS[date.getDay()];
    // Also accept numeric strings 0-6
    return days.includes(weekday) || days.includes(String(date.getDay()));
  }

  return false;
};

export const useSubscriptionDeliveryHistory = (subscriptionId: string | null) => {
  return useQuery({
    queryKey: ['subscription-delivery-history', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return {};

      const today = getCurrentISTTime();
      const windowStart = subDays(today, 60);
      const windowEnd = addDays(today, 60);
      const windowStartStr = format(windowStart, 'yyyy-MM-dd');
      const windowEndStr = format(windowEnd, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch subscription schedule
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('start_date, end_date, subscription_type, delivery_days, status')
        .eq('id', subscriptionId)
        .maybeSingle();

      if (subError) throw subError;

      // Fetch daily_orders within window
      const { data: dailyOrders, error: ordersError } = await supabase
        .from('daily_orders')
        .select('id, date, status')
        .eq('subscription_id', subscriptionId)
        .gte('date', windowStartStr)
        .lte('date', windowEndStr)
        .order('date', { ascending: true });

      if (ordersError) throw ordersError;

      // Fetch compensations
      const { data: compensations, error: compError } = await supabase
        .from('vacation_compensations')
        .select('original_vacation_date, status')
        .eq('subscription_id', subscriptionId)
        .gte('original_vacation_date', windowStartStr);

      if (compError) throw compError;

      const compMap = new Map<string, string>();
      (compensations || []).forEach((c) => {
        compMap.set(c.original_vacation_date, c.status || 'pending');
      });

      const history: Record<string, DeliveryDayStatus> = {};

      // 1) Populate from daily_orders rows (source of truth where present)
      (dailyOrders || []).forEach((order) => {
        history[order.date] = {
          date: order.date,
          status: order.status,
          dailyOrderId: order.id,
          hasCompensation: compMap.has(order.date),
          compensationStatus: compMap.get(order.date) || null,
        };
      });

      // 2) Fill in scheduled days from the subscription pattern
      if (sub) {
        let cursor = windowStart;
        while (cursor <= windowEnd) {
          const dateStr = format(cursor, 'yyyy-MM-dd');
          if (!history[dateStr] && isScheduledDay(cursor, sub as SubscriptionSchedule)) {
            const isPast = dateStr < todayStr;
            history[dateStr] = {
              date: dateStr,
              status: isPast ? 'pending' : 'pending', // 'pending' past => missed, future => scheduled (handled by calendar)
              dailyOrderId: null,
              hasCompensation: compMap.has(dateStr),
              compensationStatus: compMap.get(dateStr) || null,
            };
          }
          cursor = addDays(cursor, 1);
        }
      }

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
      const windowStart = subDays(today, 60);
      const windowStartStr = format(windowStart, 'yyyy-MM-dd');

      // Subscription schedules
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('id, start_date, end_date, subscription_type, delivery_days, status')
        .in('id', subscriptionIds);
      if (subsError) throw subsError;

      // daily_orders within window for these subs
      const { data: rows, error: rowsError } = await supabase
        .from('daily_orders')
        .select('subscription_id, date, status')
        .in('subscription_id', subscriptionIds)
        .gte('date', windowStartStr)
        .lt('date', todayStr);
      if (rowsError) throw rowsError;

      // Compensations
      const { data: compensations, error: compError } = await supabase
        .from('vacation_compensations')
        .select('subscription_id, original_vacation_date')
        .in('subscription_id', subscriptionIds)
        .gte('original_vacation_date', windowStartStr);
      if (compError) throw compError;

      const compensatedSet = new Set<string>();
      (compensations || []).forEach((c) => {
        compensatedSet.add(`${c.subscription_id}:${c.original_vacation_date}`);
      });

      // Build per-sub map of recorded daily_orders by date
      const recordedMap = new Map<string, Map<string, string>>();
      (rows || []).forEach((r) => {
        if (!recordedMap.has(r.subscription_id)) recordedMap.set(r.subscription_id, new Map());
        recordedMap.get(r.subscription_id)!.set(r.date, r.status);
      });

      const missedStatuses = new Set(['pending', 'failed', 'undelivered', 'cancelled_agent', 'delivery_failed']);
      const counts: Record<string, number> = {};

      (subs || []).forEach((sub) => {
        const recorded = recordedMap.get(sub.id) || new Map();
        let cursor = windowStart;
        while (cursor < today) {
          const dateStr = format(cursor, 'yyyy-MM-dd');
          if (dateStr < todayStr) {
            const isScheduled = isScheduledDay(cursor, sub as SubscriptionSchedule);
            const recordedStatus = recorded.get(dateStr);
            const compensated = compensatedSet.has(`${sub.id}:${dateStr}`);

            let isMissed = false;
            if (recordedStatus) {
              isMissed = missedStatuses.has(recordedStatus);
            } else if (isScheduled) {
              isMissed = true;
            }

            if (isMissed && !compensated) {
              counts[sub.id] = (counts[sub.id] || 0) + 1;
            }
          }
          cursor = addDays(cursor, 1);
        }
      });

      return counts;
    },
    enabled: subscriptionIds.length > 0,
  });
};
