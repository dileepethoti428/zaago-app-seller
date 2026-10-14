import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { isScheduledOrder } from '@/utils/scheduledOrder';

const EXCLUDED = ['cancelled', 'rejected', 'delivered', 'payment_pending', 'failed'];

const todayIST = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const useUpcomingScheduledOrders = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['upcoming-scheduled-orders', user?.id],
    enabled: !!user?.id,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_seller_specific_orders', { p_seller_user_id: user!.id })
        .range(0, 999);
      if (error) throw error;
      const today = todayIST();
      const upcoming = ((data as any[]) || []).filter(
        (o) => isScheduledOrder(o) && !EXCLUDED.includes(o.status) && (!o.delivery_date || o.delivery_date >= today)
      );
      const byDate: Record<string, number> = {};
      upcoming.forEach((o) => { if (o.delivery_date) byDate[o.delivery_date] = (byDate[o.delivery_date] || 0) + 1; });
      const nextDate = Object.keys(byDate).sort()[0] || null;
      return { total: upcoming.length, nextDate, nextCount: nextDate ? byDate[nextDate] : 0 };
    },
  });
};
