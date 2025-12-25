import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface TodayRegularOrdersOverview {
  totalOrders: number;
  assignedOrders: number;
  unassignedOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
}

export const useTodayRegularOrdersOverview = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['today-regular-orders-overview', user?.id],
    queryFn: async (): Promise<TodayRegularOrdersOverview> => {
      if (!user?.id) {
        return { totalOrders: 0, assignedOrders: 0, unassignedOrders: 0, deliveredOrders: 0, pendingOrders: 0 };
      }

      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch regular orders for today for this seller
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, assigned_agent_id, status')
        .eq('delivery_date', today)
        .eq('user_id', user.id);

      if (ordersError) {
        console.error('Error fetching today regular orders:', ordersError);
        throw ordersError;
      }

      const totalOrders = orders?.length || 0;
      const assignedOrders = orders?.filter(o => o.assigned_agent_id !== null).length || 0;
      const unassignedOrders = totalOrders - assignedOrders;
      const deliveredOrders = orders?.filter(o => o.status === 'delivered').length || 0;
      const pendingOrders = orders?.filter(o => o.assigned_agent_id !== null && o.status !== 'delivered').length || 0;

      return {
        totalOrders,
        assignedOrders,
        unassignedOrders,
        deliveredOrders,
        pendingOrders,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
