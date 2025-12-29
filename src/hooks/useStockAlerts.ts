import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTomorrowSubscriptionForecast } from './useTomorrowSubscriptionForecast';
import { format } from 'date-fns';

export interface StockAlert {
  productId: string;
  productName: string;
  unit: string;
  currentStock: number;
  soldToday: number;
  requiredTomorrow: number;
  projectedStock: number;
  isLowStock: boolean;
  refillNeeded: number;
}

export interface StockAlertsData {
  alerts: StockAlert[];
  allProducts: StockAlert[];
  totalLowStockItems: number;
  totalRefillQuantity: number;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
  sellerName: string;
}

export const useStockAlerts = () => {
  const { user } = useAuth();
  const { productForecast, isLoading: forecastLoading } = useTomorrowSubscriptionForecast();
  
  const [data, setData] = useState<StockAlertsData>({
    alerts: [],
    allProducts: [],
    totalLowStockItems: 0,
    totalRefillQuantity: 0,
    lastUpdated: null,
    isLoading: true,
    error: null,
    sellerName: '',
  });

  const fetchStockAlerts = useCallback(async () => {
    if (!user?.id) return;
    
    setData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 1. Fetch seller profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const sellerName = profile?.full_name || 'Seller';

      // 2. Fetch seller's products with stock
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit, stock_quantity, seller_id')
        .eq('seller_id', user.id)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // 2. Fetch today's orders for this seller
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch regular orders for today
      const { data: regularOrders, error: regularError } = await supabase
        .from('orders')
        .select('items')
        .eq('seller_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (regularError) throw regularError;

      // Fetch subscription orders for today using daily_orders table
      const { data: subscriptionOrders, error: subError } = await supabase
        .from('daily_orders')
        .select(`
          quantity,
          subscription:subscriptions!inner(
            product_id,
            seller_id
          )
        `)
        .eq('date', today)
        .eq('subscriptions.seller_id', user.id);

      if (subError) {
        console.warn('Error fetching subscription orders:', subError);
      }

      // 3. Calculate sold today per product
      const soldTodayMap: Record<string, number> = {};
      
      // Process regular orders
      regularOrders?.forEach(order => {
        const items = order.items as Array<{ product_id: string; quantity: number }>;
        items?.forEach(item => {
          if (item.product_id && item.quantity) {
            soldTodayMap[item.product_id] = (soldTodayMap[item.product_id] || 0) + item.quantity;
          }
        });
      });

      // Process subscription orders
      subscriptionOrders?.forEach(order => {
        const productId = (order.subscription as any)?.product_id;
        if (productId && order.quantity) {
          soldTodayMap[productId] = (soldTodayMap[productId] || 0) + order.quantity;
        }
      });

      // 4. Build tomorrow's required map from forecast
      const tomorrowRequiredMap: Record<string, number> = {};
      productForecast?.forEach(item => {
        if (item.productId) {
          tomorrowRequiredMap[item.productId] = item.totalQuantity;
        }
      });

      // 5. Calculate stock alerts for each product
      const allProductAlerts: StockAlert[] = (products || []).map(product => {
        const currentStock = product.stock_quantity || 0;
        const soldToday = soldTodayMap[product.id] || 0;
        const requiredTomorrow = tomorrowRequiredMap[product.id] || 0;
        const projectedStock = currentStock - soldToday;
        const isLowStock = projectedStock < requiredTomorrow;
        const refillNeeded = isLowStock ? Math.ceil(requiredTomorrow - projectedStock) : 0;

        return {
          productId: product.id,
          productName: product.name,
          unit: product.unit || 'units',
          currentStock,
          soldToday,
          requiredTomorrow,
          projectedStock,
          isLowStock,
          refillNeeded,
        };
      });

      // 6. Filter to only low stock items
      const lowStockAlerts = allProductAlerts.filter(alert => alert.isLowStock);
      const totalRefillQuantity = lowStockAlerts.reduce((sum, alert) => sum + alert.refillNeeded, 0);

      setData({
        alerts: lowStockAlerts,
        allProducts: allProductAlerts,
        totalLowStockItems: lowStockAlerts.length,
        totalRefillQuantity,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
        sellerName,
      });
    } catch (error: any) {
      console.error('Error fetching stock alerts:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch stock alerts',
      }));
    }
  }, [user?.id, productForecast]);

  // Initial fetch
  useEffect(() => {
    if (!forecastLoading) {
      fetchStockAlerts();
    }
  }, [fetchStockAlerts, forecastLoading]);

  return { ...data, refetch: fetchStockAlerts };
};
