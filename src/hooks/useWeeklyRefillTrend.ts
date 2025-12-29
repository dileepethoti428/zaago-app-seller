import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, subDays, parseISO, differenceInDays, getDay, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

interface VacationPeriod {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
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
  subscription_vacation_periods: VacationPeriod[];
}

export interface DailyTrendData {
  date: string;
  dayLabel: string;
  sold: number;
  forecast: number;
  refillNeeded: number;
}

export interface ProductTrendSummary {
  productId: string;
  productName: string;
  unit: string;
  daysRefillNeeded: number;
  totalRefillQuantity: number;
  avgDailyRefill: number;
  dailyData: DailyTrendData[];
}

export interface WeeklyTrendData {
  products: ProductTrendSummary[];
  chartData: DailyTrendData[];
  dateRange: { start: string; end: string };
  totalRefillQuantity: number;
  top3Products: ProductTrendSummary[];
  isLoading: boolean;
  error: string | null;
  sellerName: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  seller_id?: string;
}

const getNowIST = (): Date => {
  return toZonedTime(new Date(), IST_TIMEZONE);
};

const isDateInVacation = (date: Date, vacationPeriods: VacationPeriod[]): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return vacationPeriods.some(vacation => {
    if (vacation.status !== 'active') return false;
    return dateStr >= vacation.start_date && dateStr <= vacation.end_date;
  });
};

const shouldDeliverOnDate = (sub: Subscription, targetDate: Date): boolean => {
  if (!sub.is_active) return false;

  const targetStr = format(targetDate, 'yyyy-MM-dd');
  if (sub.start_date && targetStr < sub.start_date) return false;
  if (sub.end_date && targetStr > sub.end_date) return false;
  if (isDateInVacation(targetDate, sub.subscription_vacation_periods || [])) return false;

  const dayOfWeek = getDay(targetDate);
  const dayName = format(targetDate, 'EEEE').toLowerCase();

  switch (sub.subscription_type) {
    case 'everyday':
    case 'daily':
      return true;
    case 'weekend':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'alternative':
    case 'alternate': {
      if (!sub.start_date) return true;
      const startDate = parseISO(sub.start_date);
      const daysSinceStart = differenceInDays(targetDate, startDate);
      return daysSinceStart >= 0 && daysSinceStart % 2 === 0;
    }
    case 'custom': {
      const deliveryDays = sub.delivery_days || [];
      return deliveryDays.some(day => day.toLowerCase() === dayName);
    }
    default:
      return false;
  }
};

export const useWeeklyRefillTrend = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WeeklyTrendData>({
    products: [],
    chartData: [],
    dateRange: { start: '', end: '' },
    totalRefillQuantity: 0,
    top3Products: [],
    isLoading: true,
    error: null,
    sellerName: ''
  });

  const fetchWeeklyTrend = useCallback(async () => {
    if (!user) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }));
      return;
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const nowIST = getNowIST();
      const today = format(nowIST, 'yyyy-MM-dd');
      const weekAgo = format(subDays(nowIST, 6), 'yyyy-MM-dd');

      // Fetch seller name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const sellerName = profile?.full_name || 'Seller';

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit, stock_quantity')
        .eq('seller_id', user.id);

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        setData({
          products: [],
          chartData: [],
          dateRange: { start: weekAgo, end: today },
          totalRefillQuantity: 0,
          top3Products: [],
          isLoading: false,
          error: null,
          sellerName
        });
        return;
      }

      const productIds = products.map(p => p.id);
      const productMap = new Map(products.map(p => [p.id, p]));

      // Fetch orders for last 7 days
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, items, created_at, status')
        .gte('created_at', `${weekAgo}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (ordersError) throw ordersError;

      // Fetch active subscriptions
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

      // Generate last 7 days
      const days: Date[] = [];
      for (let i = 6; i >= 0; i--) {
        days.push(subDays(nowIST, i));
      }

      // Calculate per-product daily data
      const productTrendMap = new Map<string, ProductTrendSummary>();

      products.forEach(product => {
        const dailyData: DailyTrendData[] = [];
        let totalRefill = 0;
        let daysWithRefill = 0;
        let runningStock = product.stock_quantity || 0;

        days.forEach((day, dayIndex) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayLabel = format(day, 'EEE');

          // Calculate sold for this day
          let soldOnDay = 0;
          (orders || []).forEach(order => {
            const orderDate = format(parseISO(order.created_at), 'yyyy-MM-dd');
            if (orderDate !== dayStr) return;

            const items = (order.items as unknown as OrderItem[]) || [];
            items.forEach(item => {
              if (item.id === product.id || item.seller_id === user.id) {
                soldOnDay += item.quantity || 0;
              }
            });
          });

          // Calculate forecast for next day (subscriptions)
          const nextDay = addDays(day, 1);
          let forecastForNextDay = 0;
          (subscriptions || []).forEach(sub => {
            if (sub.product_id !== product.id) return;
            const subWithVacations = {
              ...sub,
              subscription_vacation_periods: sub.subscription_vacation_periods || []
            } as Subscription;
            if (shouldDeliverOnDate(subWithVacations, nextDay)) {
              forecastForNextDay += sub.quantity || 1;
            }
          });

          // Calculate refill needed
          const projectedNeed = soldOnDay + forecastForNextDay;
          const refillNeeded = projectedNeed > runningStock ? projectedNeed - runningStock : 0;

          // Update running stock (simple simulation)
          runningStock = Math.max(0, runningStock - soldOnDay);

          if (refillNeeded > 0) {
            totalRefill += refillNeeded;
            daysWithRefill++;
          }

          dailyData.push({
            date: dayStr,
            dayLabel,
            sold: soldOnDay,
            forecast: forecastForNextDay,
            refillNeeded
          });
        });

        if (totalRefill > 0 || dailyData.some(d => d.sold > 0 || d.forecast > 0)) {
          productTrendMap.set(product.id, {
            productId: product.id,
            productName: product.name,
            unit: product.unit || 'piece',
            daysRefillNeeded: daysWithRefill,
            totalRefillQuantity: totalRefill,
            avgDailyRefill: daysWithRefill > 0 ? totalRefill / daysWithRefill : 0,
            dailyData
          });
        }
      });

      // Aggregate chart data (sum across all products per day)
      const chartData: DailyTrendData[] = days.map((day, i) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayLabel = format(day, 'EEE');
        let totalSold = 0;
        let totalForecast = 0;
        let totalRefill = 0;

        productTrendMap.forEach(product => {
          const dayData = product.dailyData[i];
          if (dayData) {
            totalSold += dayData.sold;
            totalForecast += dayData.forecast;
            totalRefill += dayData.refillNeeded;
          }
        });

        return { date: dayStr, dayLabel, sold: totalSold, forecast: totalForecast, refillNeeded: totalRefill };
      });

      // Sort products by total refill quantity
      const productList = Array.from(productTrendMap.values())
        .sort((a, b) => b.totalRefillQuantity - a.totalRefillQuantity);

      const totalRefillQuantity = productList.reduce((sum, p) => sum + p.totalRefillQuantity, 0);
      const top3Products = productList.slice(0, 3);

      setData({
        products: productList,
        chartData,
        dateRange: { start: weekAgo, end: today },
        totalRefillQuantity,
        top3Products,
        isLoading: false,
        error: null,
        sellerName
      });

    } catch (err) {
      console.error('Error fetching weekly refill trend:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch weekly trend'
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchWeeklyTrend();
  }, [fetchWeeklyTrend]);

  return { ...data, refetch: fetchWeeklyTrend };
};
