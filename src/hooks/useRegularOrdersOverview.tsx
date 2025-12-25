import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface RegularOrdersOverview {
  totalOrders: number;
  placedOrders: number;
  rejectedOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
}

export const useRegularOrdersOverview = (
  dateFilter: string = 'today',
  sortBy: string = 'newest'
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['regular-orders-overview', user?.id, dateFilter, sortBy],
    queryFn: async (): Promise<RegularOrdersOverview> => {
      if (!user?.id) {
        return { totalOrders: 0, placedOrders: 0, rejectedOrders: 0, deliveredOrders: 0, pendingOrders: 0 };
      }

      // Use the new RPC function with filters
      const { data: orders, error: ordersError } = await supabase
        .rpc('get_seller_orders_with_filters', {
          seller_user_id: user.id,
          date_filter: dateFilter,
          sort_by: sortBy
        });

      if (ordersError) {
        console.error('Error fetching regular orders with filters:', ordersError);
        throw ordersError;
      }

      const totalOrders = orders?.length || 0;
      const placedOrders = orders?.filter((o: any) => o.status === 'placed').length || 0;
      const rejectedOrders = orders?.filter((o: any) => o.status === 'rejected').length || 0;
      const deliveredOrders = orders?.filter((o: any) => o.status === 'delivered').length || 0;
      const pendingOrders = orders?.filter((o: any) => 
        ['accepted', 'accepted_by_seller', 'accepted_late', 'assigned', 'out_for_delivery', 'in_transit'].includes(o.status)
      ).length || 0;

      return {
        totalOrders,
        placedOrders,
        rejectedOrders,
        deliveredOrders,
        pendingOrders,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};
