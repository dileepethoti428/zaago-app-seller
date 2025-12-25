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

      // Get seller's location_id for reference
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('location_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (sellerError) {
        console.error('Error fetching seller:', sellerError);
        throw sellerError;
      }

      const today = format(new Date(), 'yyyy-MM-dd');

      // Use RPC to get seller-specific subscription orders overview
      const { data, error } = await supabase.rpc('get_seller_subscription_orders_overview' as any, {
        p_seller_user_id: user.id,
        p_date: today
      });

      if (error) {
        console.error('Error fetching today orders overview:', error);
        throw error;
      }

      const result = data?.[0] || { total_orders: 0, assigned_orders: 0, unassigned_orders: 0, delivered_orders: 0, pending_orders: 0 };

      return {
        totalOrders: Number(result.total_orders) || 0,
        assignedOrders: Number(result.assigned_orders) || 0,
        unassignedOrders: Number(result.unassigned_orders) || 0,
        deliveredOrders: Number(result.delivered_orders) || 0,
        pendingOrders: Number(result.pending_orders) || 0,
        locationId: seller?.location_id || null,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};
