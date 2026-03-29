import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface SalesReportItem {
  date: string;
  orderId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
}

export const useSalesReport = (startDate: string | null, endDate: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-report', user?.id, startDate, endDate],
    queryFn: async (): Promise<SalesReportItem[]> => {
      if (!user?.id) return [];

      // Fetch products for discount fallback
      const { data: productsData } = await supabase
        .from('products')
        .select('id, discount_percentage')
        .eq('seller_id', user.id);

      const productDiscountMap: Record<string, number> = {};
      (productsData || []).forEach((p: any) => {
        productDiscountMap[p.id] = p.discount_percentage || 0;
      });

      let query = supabase
        .from('orders')
        .select('id, created_at, total, status, items')
        .eq('seller_id', user.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales report:', error);
        return [];
      }

      const result: SalesReportItem[] = [];
      (data || []).forEach((order: any) => {
        const orderItems = Array.isArray(order.items) ? order.items : [];
        if (orderItems.length === 0) {
          result.push({
            date: order.created_at,
            orderId: order.id,
            productName: 'N/A',
            quantity: 1,
            unitPrice: 0,
            total: 0,
            status: order.status,
          });
        } else {
          orderItems.forEach((item: any) => {
            const qty = item.quantity || 1;
            const originalPrice = item.price || 0;
            const discountPct = item.discount_percentage || 0;
            const price = originalPrice * (1 - discountPct / 100);
            result.push({
              date: order.created_at,
              orderId: order.id,
              productName: item.name || 'Unknown',
              quantity: qty,
              unitPrice: price,
              total: qty * price,
              status: order.status,
            });
          });
        }
      });

      return result;
    },
    enabled: !!user?.id,
  });
};
