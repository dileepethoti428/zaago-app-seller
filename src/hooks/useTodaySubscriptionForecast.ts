import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

const IST_TIMEZONE = 'Asia/Kolkata';

const getTodayIST = (): Date => toZonedTime(new Date(), IST_TIMEZONE);

export const useTodaySubscriptionForecast = () => {
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

      const todayDate = getTodayIST();
      const todayStr = format(todayDate, 'yyyy-MM-dd');
      const todayFormatted = format(todayDate, 'EEEE, MMM d');

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit')
        .eq('seller_id', user.id);

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        setData({
          todayDate: todayStr,
          todayFormatted,
          totalForecastItems: 0,
          totalActiveSubscriptions: 0,
          productForecast: [],
          lastUpdated: new Date(),
          isLoading: false,
          error: null
        });
        return;
      }

      const productIds = products.map(p => p.id);
      const productMap = new Map(products.map(p => [p.id, p]));

      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          product_id,
          customer_id,
          quantity,
          subscription_vacation_periods (
            id,
            start_date,
            end_date,
            status
          )
        `)
        .in('product_id', productIds)
        .eq('is_active', true)
        .eq('next_delivery_date', todayStr);

      if (subsError) throw subsError;

      const eligibleSubscriptions = (subscriptions || []).filter(sub => {
        const vacations = sub.subscription_vacation_periods || [];
        const onVacation = vacations.some(v =>
          v.status === 'active' && todayStr >= v.start_date && todayStr <= v.end_date
        );
        return !onVacation;
      });

      const dedupMap = new Map<string, typeof eligibleSubscriptions[0]>();
      for (const sub of eligibleSubscriptions) {
        const key = `${sub.customer_id}::${sub.product_id}`;
        const existing = dedupMap.get(key);
        if (!existing || (sub.quantity || 1) > (existing.quantity || 1)) {
          dedupMap.set(key, sub);
        }
      }
      const dedupedSubscriptions = Array.from(dedupMap.values());

      const productForecastMap = new Map<string, ForecastItem>();

      dedupedSubscriptions.forEach(sub => {
        const product = productMap.get(sub.product_id);
        if (!product) return;

        const existing = productForecastMap.get(sub.product_id) || {
          productId: sub.product_id,
          productName: product.name || 'Unknown Product',
          unit: product.unit || 'piece',
          totalQuantity: 0,
          subscriptionCount: 0
        };

        existing.totalQuantity += sub.quantity || 1;
        existing.subscriptionCount += 1;
        productForecastMap.set(sub.product_id, existing);
      });

      const productForecast = Array.from(productForecastMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

      const totalForecastItems = productForecast.reduce((sum, p) => sum + p.totalQuantity, 0);
      const totalActiveSubscriptions = dedupedSubscriptions.length;

      setData({
        todayDate: todayStr,
        todayFormatted,
        totalForecastItems,
        totalActiveSubscriptions,
        productForecast,
        lastUpdated: new Date(),
        isLoading: false,
        error: null
      });

    } catch (err) {
      console.error('Error fetching today forecast:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch forecast'
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return { ...data, refetch: fetchForecast };
};
