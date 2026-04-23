import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export type ForecastMode = 'today' | 'tomorrow';

export interface ForecastItem {
  productId: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  subscriptionCount: number;
}

export interface TodayForecastData {
  todayDate: string;
  todayFormatted: string;
  totalForecastItems: number;
  totalActiveSubscriptions: number;
  productForecast: ForecastItem[];
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

interface RawHandoverRow {
  agent_id: string;
  product_id: string;
  product_name: string;
  product_unit: string | null;
  customer_name: string;
  customer_quantity: number;
}

const IST_TIMEZONE = 'Asia/Kolkata';

const getTodayIST = (): Date => toZonedTime(new Date(), IST_TIMEZONE);

export const useTodaySubscriptionForecast = (mode: ForecastMode = 'today') => {
  const { user } = useAuth();
  const [data, setData] = useState<TodayForecastData>({
    todayDate: '',
    todayFormatted: '',
    totalForecastItems: 0,
    totalActiveSubscriptions: 0,
    productForecast: [],
    lastUpdated: new Date(),
    isLoading: true,
    error: null
  });

  const fetchForecast = useCallback(async () => {
    if (!user) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }));
      return;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const baseDate = getTodayIST();
      const targetDate = mode === 'tomorrow' ? addDays(baseDate, 1) : baseDate;
      const todayStr = format(targetDate, 'yyyy-MM-dd');
      const todayFormatted = format(targetDate, 'EEEE, MMM d');

      // Use the same source as the Handover card to guarantee consistency.
      const { data: rows, error: rpcError } = await supabase.rpc(
        'get_seller_subscription_handover_direct',
        {
          seller_user_id: user.id,
          handover_date: todayStr,
        }
      );

      if (rpcError) throw rpcError;

      const handoverRows = (rows as RawHandoverRow[] | null) || [];

      const productForecastMap = new Map<string, ForecastItem>();

      for (const row of handoverRows) {
        const existing = productForecastMap.get(row.product_id) || {
          productId: row.product_id,
          productName: row.product_name || 'Unknown Product',
          unit: row.product_unit || 'piece',
          totalQuantity: 0,
          subscriptionCount: 0,
        };

        existing.totalQuantity += row.customer_quantity || 0;
        existing.subscriptionCount += 1;
        productForecastMap.set(row.product_id, existing);
      }

      const productForecast = Array.from(productForecastMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

      const totalForecastItems = productForecast.reduce((sum, p) => sum + p.totalQuantity, 0);
      const totalActiveSubscriptions = productForecast.reduce(
        (sum, p) => sum + p.subscriptionCount,
        0
      );

      setData({
        todayDate: todayStr,
        todayFormatted,
        totalForecastItems,
        totalActiveSubscriptions,
        productForecast,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching today forecast:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch forecast',
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return { ...data, refetch: fetchForecast };
};
