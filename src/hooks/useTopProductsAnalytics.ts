import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface TopProduct {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  total_quantity: number;
  total_revenue: number;
  total_orders: number;
  period_label: string;
}

export type SortBy = 'revenue' | 'quantity' | 'orders';
export type TimePeriod = 'today' | 'week' | 'month' | '6_months' | '1_year';

export const useTopProductsAnalytics = (
  timePeriod: TimePeriod = 'month',
  sortBy: SortBy = 'revenue',
  limit: number = 5
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['top-products-analytics', user?.id, timePeriod, sortBy, limit],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_seller_top_products_analytics', {
        seller_user_id: user.id,
        time_period: timePeriod,
        sort_by: sortBy,
        limit_count: limit
      });

      if (error) {
        console.error('Error fetching top products:', error);
        throw error;
      }

      return (data as TopProduct[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000
  });
};
