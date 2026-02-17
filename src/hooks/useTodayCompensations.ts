import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { getCurrentISTTime } from '@/utils/timeZone';

export interface TodayCompensation {
  id: string;
  subscription_id: string;
  product_name: string;
  quantity: number;
  agent_name: string;
  customer_name: string;
  compensation_delivery_date: string;
  original_missed_date: string;
  status: string;
}

export const useTodayCompensations = () => {
  const { user } = useAuth();
  const today = format(getCurrentISTTime(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['today-compensations', user?.id, today],
    queryFn: async (): Promise<TodayCompensation[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('vacation_compensations')
        .select(`
          id,
          subscription_id,
          quantity,
          compensation_delivery_date,
          original_vacation_date,
          status,
          assigned_agent_id,
          seller_id,
          product_id,
          products ( name ),
          delivery_agents ( name ),
          customers ( full_name )
        `)
        .eq('compensation_delivery_date', today)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching today compensations:', error);
        return [];
      }

      // Filter by seller and map
      return (data || [])
        .filter((c: any) => c.seller_id === user.id)
        .map((c: any) => ({
          id: c.id,
          subscription_id: c.subscription_id,
          product_name: c.products?.name || 'Unknown',
          quantity: c.quantity || 0,
          agent_name: c.delivery_agents?.name || 'Unassigned',
          customer_name: c.customers?.full_name || 'Unknown',
          compensation_delivery_date: c.compensation_delivery_date,
          original_missed_date: c.original_vacation_date,
          status: c.status,
        }));
    },
    enabled: !!user?.id,
  });
};
