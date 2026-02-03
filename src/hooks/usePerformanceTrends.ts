import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type TimeRange = '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
export type MetricType = 'orders' | 'revenue' | 'efficiency';
export type ChartType = 'area' | 'line' | 'stacked';

export interface TrendDataPoint {
  period_start: string;
  period_label: string;
  total_orders: number;
  delivered_orders: number;
  failed_orders: number;
  total_revenue: number;
  completion_rate: number;
}

export interface PerformanceSummary {
  total_orders: number;
  delivered_orders: number;
  failed_orders: number;
  total_revenue: number;
  completion_rate: number;
  avg_daily_orders: number;
}

export const usePerformanceTrends = (timeRange: TimeRange = '1m') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['performance-trends', user?.id, timeRange],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_seller_performance_trends', {
        seller_user_id: user.id,
        time_range: timeRange
      });

      if (error) {
        console.error('Error fetching performance trends:', error);
        throw error;
      }

      return (data || []) as TrendDataPoint[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000
  });
};

export const usePerformanceSummary = (timeRange: TimeRange = '1m') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['performance-summary', user?.id, timeRange],
    queryFn: async (): Promise<PerformanceSummary | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc('get_seller_performance_summary', {
        seller_user_id: user.id,
        time_range: timeRange
      });

      if (error) {
        console.error('Error fetching performance summary:', error);
        throw error;
      }

      if (data && data.length > 0) {
        return data[0] as PerformanceSummary;
      }
      return null;
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000
  });
};
