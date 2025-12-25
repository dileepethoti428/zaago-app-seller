import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, addDays } from 'date-fns';

interface TomorrowOrdersOverview {
  totalOrders: number;
  assignedOrders: number;
  unassignedOrders: number;
  locationId: number | null;
}

export const useTomorrowOrdersOverview = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tomorrow-orders-overview', user?.id],
    queryFn: async (): Promise<TomorrowOrdersOverview> => {
      if (!user?.id) {
        return { totalOrders: 0, assignedOrders: 0, unassignedOrders: 0, locationId: null };
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

      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      // Use RPC to get seller-specific subscription orders overview
      const { data, error } = await supabase.rpc('get_seller_subscription_orders_overview' as any, {
        p_seller_user_id: user.id,
        p_date: tomorrow
      });

      if (error) {
        console.error('Error fetching tomorrow orders overview:', error);
        throw error;
      }

      const result = data?.[0] || { total_orders: 0, assigned_orders: 0, unassigned_orders: 0 };

      return {
        totalOrders: Number(result.total_orders) || 0,
        assignedOrders: Number(result.assigned_orders) || 0,
        unassignedOrders: Number(result.unassigned_orders) || 0,
        locationId: seller?.location_id || null,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};
