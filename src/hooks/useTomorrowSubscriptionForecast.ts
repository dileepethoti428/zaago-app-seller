import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, addDays, parseISO, differenceInDays, getDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface VacationPeriod {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface SubscriptionProduct {
  id: string;
  name: string;
  unit: string;
}

interface Subscription {
  id: string;
  product_id: string;
  quantity: number;
  subscription_type: string;
  delivery_days: string[] | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  products: SubscriptionProduct | null;
  subscription_vacation_periods: VacationPeriod[];
}

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

const isDateInVacation = (date: Date, vacationPeriods: VacationPeriod[]): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return vacationPeriods.some(vacation => {
    if (vacation.status !== 'active') return false;
    const startDate = vacation.start_date;
    const endDate = vacation.end_date;
    return dateStr >= startDate && dateStr <= endDate;
  });
};

const shouldDeliverTomorrow = (sub: Subscription, tomorrowDate: Date): boolean => {
  // Check if subscription is active
  if (!sub.is_active) return false;

  const tomorrowStr = format(tomorrowDate, 'yyyy-MM-dd');

  // Check if within date range
  if (sub.start_date && tomorrowStr < sub.start_date) return false;
  if (sub.end_date && tomorrowStr > sub.end_date) return false;

  // Check if tomorrow falls in a vacation period
  if (isDateInVacation(tomorrowDate, sub.subscription_vacation_periods || [])) return false;

  // Apply subscription type rules
  const dayOfWeek = getDay(tomorrowDate); // 0=Sunday, 6=Saturday
  const dayName = format(tomorrowDate, 'EEEE').toLowerCase(); // monday, tuesday, etc.

  switch (sub.subscription_type) {
    case 'everyday':
    case 'daily':
      return true;
    
    case 'weekend':
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday or Sunday
    
    case 'alternative':
    case 'alternate': {
      // Every alternate day from start
      if (!sub.start_date) return true;
      const startDate = parseISO(sub.start_date);
      const daysSinceStart = differenceInDays(tomorrowDate, startDate);
      return daysSinceStart >= 0 && daysSinceStart % 2 === 0;
    }
    
    case 'custom': {
      // delivery_days is an array like ["monday", "wednesday", "friday"]
      const deliveryDays = sub.delivery_days || [];
      return deliveryDays.some(day => day.toLowerCase() === dayName);
    }
    
    default:
      return false;
  }
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

      // 2. Fetch active subscriptions for seller's products with vacation periods
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          product_id,
          quantity,
          subscription_type,
          delivery_days,
          start_date,
          end_date,
          is_active,
          subscription_vacation_periods (
            id,
            start_date,
            end_date,
            status
          )
        `)
        .in('product_id', productIds)
        .eq('is_active', true);

      if (subsError) throw subsError;

      // 3. Filter subscriptions that should deliver tomorrow
      const eligibleSubscriptions = (subscriptions || []).filter(sub => {
        const subWithProduct = {
          ...sub,
          products: productMap.get(sub.product_id) || null,
          subscription_vacation_periods: sub.subscription_vacation_periods || []
        } as Subscription;
        return shouldDeliverTomorrow(subWithProduct, tomorrowDate);
      });

      // 4. Aggregate by product
      const productForecastMap = new Map<string, ForecastItem>();

      eligibleSubscriptions.forEach(sub => {
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
      const totalActiveSubscriptions = eligibleSubscriptions.length;

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
