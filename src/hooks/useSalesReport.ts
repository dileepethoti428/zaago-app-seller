import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface SalesReportItem {
  date: string;
  orderId: string;
  customerName: string;
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

      let query = supabase
        .from('orders')
        .select(`
          id,
          created_at,
          total,
          status,
          customer_name,
          order_items (
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
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

      const items: SalesReportItem[] = [];
      (data || []).forEach((order: any) => {
        const orderItems = order.order_items || [];
        if (orderItems.length === 0) {
          items.push({
            date: order.created_at,
            orderId: order.id,
            customerName: order.customer_name || 'Unknown',
            productName: 'N/A',
            quantity: 1,
            unitPrice: order.total || 0,
            total: order.total || 0,
            status: order.status,
          });
        } else {
          orderItems.forEach((item: any) => {
            items.push({
              date: order.created_at,
              orderId: order.id,
              customerName: order.customer_name || 'Unknown',
              productName: item.product_name || 'Unknown',
              quantity: item.quantity || 1,
              unitPrice: item.unit_price || 0,
              total: item.total_price || 0,
              status: order.status,
            });
          });
        }
      });

      return items;
    },
    enabled: !!user?.id,
  });
};
