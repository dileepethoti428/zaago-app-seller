import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, subDays } from 'date-fns';

export type OrderTypeFilter = 'all' | 'regular' | 'subscription';
export type DateFilter = 'today' | 'week' | 'month' | 'all';
export type StatusFilter = 'all' | 'delivered' | 'pending';

interface ItemBreakdown {
  productId: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
}

interface TodaysOrdersSummaryData {
  totalOrders: number;
  totalItems: number;
  differentProducts: number;
  itemBreakdown: ItemBreakdown[];
  lastUpdated: Date;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  product_name?: string;
  unit?: string;
}

const getDateRange = (filter: DateFilter): string | null => {
  const now = new Date();
  switch (filter) {
    case 'today':
      return format(now, 'yyyy-MM-dd');
    case 'week':
      return format(subDays(now, 7), 'yyyy-MM-dd');
    case 'month':
      return format(subDays(now, 30), 'yyyy-MM-dd');
    case 'all':
      return null;
  }
};

const mapStatusFilter = (status: StatusFilter): string[] => {
  switch (status) {
    case 'delivered':
      return ['delivered'];
    case 'pending':
      return ['pending', 'accepted', 'placed', 'out_for_delivery'];
    case 'all':
    default:
      return [];
  }
};

export const useTodaysOrdersSummary = (
  orderType: OrderTypeFilter = 'all',
  dateFilter: DateFilter = 'today',
  statusFilter: StatusFilter = 'all'
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['todays-orders-summary', user?.id, orderType, dateFilter, statusFilter],
    queryFn: async (): Promise<TodaysOrdersSummaryData> => {
      if (!user?.id) {
        return {
          totalOrders: 0,
          totalItems: 0,
          differentProducts: 0,
          itemBreakdown: [],
          lastUpdated: new Date(),
        };
      }

      // Step 1: Get seller's products
      const { data: sellerProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit')
        .eq('seller_id', user.id);

      if (productsError) {
        console.error('Error fetching seller products:', productsError);
        throw productsError;
      }

      const sellerProductIds = sellerProducts?.map(p => p.id) || [];
      const productMap = new Map(sellerProducts?.map(p => [p.id, { name: p.name, unit: p.unit || 'piece' }]) || []);

      if (sellerProductIds.length === 0) {
        return {
          totalOrders: 0,
          totalItems: 0,
          differentProducts: 0,
          itemBreakdown: [],
          lastUpdated: new Date(),
        };
      }

      const startDate = getDateRange(dateFilter);
      const statusFilters = mapStatusFilter(statusFilter);

      // Step 2: Build query for regular orders
      let regularOrders: any[] = [];
      if (orderType === 'all' || orderType === 'regular') {
        let regularQuery = supabase
          .from('orders')
          .select('id, items, status, created_at')
          .is('subscription_id', null);

        if (startDate) {
          regularQuery = regularQuery.gte('created_at', `${startDate}T00:00:00`);
        }
        if (statusFilters.length > 0) {
          regularQuery = regularQuery.in('status', statusFilters);
        }

        const { data: regularData, error: regularError } = await regularQuery;
        
        if (regularError) {
          console.error('Error fetching regular orders:', regularError);
        } else {
          // Filter orders that contain seller's products
          regularOrders = (regularData || []).filter(order => {
            const orderItems = (order.items as unknown as OrderItem[]) || [];
            return orderItems.some(item => sellerProductIds.includes(item.product_id));
          });
        }
      }

      // Step 3: Build query for subscription orders
      let subscriptionOrders: any[] = [];
      if (orderType === 'all' || orderType === 'subscription') {
        let subQuery = supabase
          .from('orders')
          .select(`
            id, items, status, created_at, subscription_id,
            subscription:subscriptions!orders_subscription_id_fkey(
              id, quantity, product_id
            )
          `)
          .not('subscription_id', 'is', null);

        if (startDate) {
          subQuery = subQuery.gte('created_at', `${startDate}T00:00:00`);
        }
        if (statusFilters.length > 0) {
          subQuery = subQuery.in('status', statusFilters);
        }

        const { data: subData, error: subError } = await subQuery;

        if (subError) {
          console.error('Error fetching subscription orders:', subError);
        } else {
          // Filter subscription orders that belong to seller's products
          subscriptionOrders = (subData || []).filter(order => {
            // Check subscription's product
            if (order.subscription?.product_id && sellerProductIds.includes(order.subscription.product_id)) {
              return true;
            }
            // Also check items array
            const orderItems = (order.items as unknown as OrderItem[]) || [];
            return orderItems.some(item => sellerProductIds.includes(item.product_id));
          });
        }
      }

      // Step 4: Combine orders and calculate aggregations
      const allOrders = [...regularOrders, ...subscriptionOrders];
      
      // Deduplicate by order id
      const uniqueOrders = Array.from(new Map(allOrders.map(o => [o.id, o])).values());

      // Calculate totals
      let totalItems = 0;
      const productBreakdown = new Map<string, { quantity: number; orderIds: Set<string> }>();
      const uniqueProductIds = new Set<string>();

      uniqueOrders.forEach(order => {
        const items = (order.items as unknown as OrderItem[]) || [];
        
        items.forEach(item => {
          // Only count items that belong to this seller
          if (!sellerProductIds.includes(item.product_id)) return;
          
          uniqueProductIds.add(item.product_id);
          totalItems += item.quantity || 0;

          const existing = productBreakdown.get(item.product_id) || { quantity: 0, orderIds: new Set() };
          existing.quantity += item.quantity || 0;
          existing.orderIds.add(order.id);
          productBreakdown.set(item.product_id, existing);
        });

        // Also handle subscription quantity if no items array
        if (order.subscription?.product_id && sellerProductIds.includes(order.subscription.product_id)) {
          if (items.length === 0 && order.subscription.quantity) {
            uniqueProductIds.add(order.subscription.product_id);
            totalItems += order.subscription.quantity;

            const existing = productBreakdown.get(order.subscription.product_id) || { quantity: 0, orderIds: new Set() };
            existing.quantity += order.subscription.quantity;
            existing.orderIds.add(order.id);
            productBreakdown.set(order.subscription.product_id, existing);
          }
        }
      });

      // Build item breakdown
      const itemBreakdown: ItemBreakdown[] = Array.from(productBreakdown.entries())
        .map(([productId, data]) => {
          const product = productMap.get(productId);
          return {
            productId,
            productName: product?.name || 'Unknown Product',
            unit: product?.unit || 'piece',
            totalQuantity: data.quantity,
            orderCount: data.orderIds.size,
          };
        })
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

      return {
        totalOrders: uniqueOrders.length,
        totalItems,
        differentProducts: uniqueProductIds.size,
        itemBreakdown,
        lastUpdated: new Date(),
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
};
