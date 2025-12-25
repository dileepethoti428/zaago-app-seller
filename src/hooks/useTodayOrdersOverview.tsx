import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface TodayOrdersOverview {
  totalOrders: number;
  assignedOrders: number;
  unassignedOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  locationId: number | null;
}

export const useTodayOrdersOverview = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['today-orders-overview', user?.id],
    queryFn: async (): Promise<TodayOrdersOverview> => {
      if (!user?.id) {
        return { totalOrders: 0, assignedOrders: 0, unassignedOrders: 0, deliveredOrders: 0, pendingOrders: 0, locationId: null };
      }

      // Get seller's location_id
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('location_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (sellerError) {
        console.error('Error fetching seller:', sellerError);
        throw sellerError;
      }

      if (!seller?.location_id) {
        return { totalOrders: 0, assignedOrders: 0, unassignedOrders: 0, deliveredOrders: 0, pendingOrders: 0, locationId: null };
      }

      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch daily orders for today in seller's location
      const { data: orders, error: ordersError } = await supabase
        .from('daily_orders')
        .select('id, assigned_agent_id, status')
        .eq('date', today)
        .eq('location_id', seller.location_id);

      if (ordersError) {
        console.error('Error fetching today orders:', ordersError);
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
        locationId: seller.location_id,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
