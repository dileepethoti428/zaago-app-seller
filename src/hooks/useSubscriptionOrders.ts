import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SubscriptionOrder {
  id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  delivery_date: string;
  assigned_agent_id: string | null;
  delivery_agent?: {
    id: string;
    name: string;
    phone: string | null;
    profile_image: string | null;
  };
}

export const useSubscriptionOrders = (subscriptionId: string | undefined) => {
  return useQuery({
    queryKey: ['subscription-orders', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          accepted_at,
          delivery_date,
          assigned_agent_id,
          delivery_agent:delivery_agents!orders_assigned_agent_id_fkey(
            id,
            name,
            phone,
            profile_image
          )
        `)
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching subscription orders:', error);
        throw error;
      }

      return data as SubscriptionOrder[];
    },
    enabled: !!subscriptionId
  });
};

export const useTodaySubscriptionOrder = (subscriptionId: string | undefined) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['subscription-order-today', subscriptionId, today],
    queryFn: async () => {
      if (!subscriptionId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          accepted_at,
          delivery_date,
          assigned_agent_id,
          delivery_agent:delivery_agents!orders_assigned_agent_id_fkey(
            id,
            name,
            phone,
            profile_image
          )
        `)
        .eq('subscription_id', subscriptionId)
        .eq('delivery_date', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching today\'s subscription order:', error);
        throw error;
      }

      return data as SubscriptionOrder | null;
    },
    enabled: !!subscriptionId,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
};
