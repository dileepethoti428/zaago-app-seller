import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export interface ForecastItem {
  productId: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  subscriptionCount: number;
}

export interface TomorrowForecastData {
  tomorrowDate: string;
  tomorrowFormatted: string;
  totalForecastItems: number;
  totalActiveSubscriptions: number;
  productForecast: ForecastItem[];
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

const IST_TIMEZONE = 'Asia/Kolkata';

const getTomorrowIST = (): Date => {
  const nowIST = toZonedTime(new Date(), IST_TIMEZONE);
  return addDays(nowIST, 1);
};

export const useTomorrowSubscriptionForecast = () => {
  const { user } = useAuth();
  const [data, setData] = useState<TomorrowForecastData>({
    tomorrowDate: '',
    tomorrowFormatted: '',
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

      const tomorrowDate = getTomorrowIST();
      const tomorrowStr = format(tomorrowDate, 'yyyy-MM-dd');
      const tomorrowFormatted = format(tomorrowDate, 'EEEE, MMM d');

      // 1. Fetch seller's products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit')
        .eq('seller_id', user.id);

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        setData({
          tomorrowDate: tomorrowStr,
          tomorrowFormatted,
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

      // 2. Fetch active subscriptions matching next_delivery_date = tomorrow
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
        .eq('next_delivery_date', tomorrowStr);

      if (subsError) throw subsError;

      // 3. Filter out subscriptions with active vacation for tomorrow
      const eligibleSubscriptions = (subscriptions || []).filter(sub => {
        const vacations = sub.subscription_vacation_periods || [];
        const onVacation = vacations.some(v =>
          v.status === 'active' && tomorrowStr >= v.start_date && tomorrowStr <= v.end_date
        );
        return !onVacation;
      });

      // 4. Deduplicate by customer_id + product_id, keeping highest quantity
      const dedupMap = new Map<string, typeof eligibleSubscriptions[0]>();
      for (const sub of eligibleSubscriptions) {
        const key = `${sub.customer_id}::${sub.product_id}`;
        const existing = dedupMap.get(key);
        if (!existing || (sub.quantity || 1) > (existing.quantity || 1)) {
          dedupMap.set(key, sub);
        }
      }
      const dedupedSubscriptions = Array.from(dedupMap.values());

      // 5. Aggregate by product
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
        tomorrowDate: tomorrowStr,
        tomorrowFormatted,
        totalForecastItems,
        totalActiveSubscriptions,
        productForecast,
        lastUpdated: new Date(),
        isLoading: false,
        error: null
      });

    } catch (err) {
      console.error('Error fetching tomorrow forecast:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch forecast'
      }));
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return { ...data, refetch: fetchForecast };
};
