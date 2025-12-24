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
        return { totalOrders: 0, assignedOrders: 0, unassignedOrders: 0, locationId: null };
      }

      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      // Fetch daily orders for tomorrow in seller's location
      const { data: orders, error: ordersError } = await supabase
        .from('daily_orders')
        .select('id, assigned_agent_id')
        .eq('date', tomorrow)
        .eq('location_id', seller.location_id);

      if (ordersError) {
        console.error('Error fetching tomorrow orders:', ordersError);
        throw ordersError;
      }

      const totalOrders = orders?.length || 0;
      const assignedOrders = orders?.filter(o => o.assigned_agent_id !== null).length || 0;
      const unassignedOrders = totalOrders - assignedOrders;

      return {
        totalOrders,
        assignedOrders,
        unassignedOrders,
        locationId: seller.location_id,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
