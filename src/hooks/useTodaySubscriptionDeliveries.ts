import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useTodaySubscriptionDeliveries = (userId: string | undefined) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['today-subscription-deliveries', userId, today],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          accepted_at,
          delivery_date,
          total_amount,
          assigned_agent_id,
          subscription_id,
          delivery_agent:delivery_agents!orders_assigned_agent_id_fkey(
            id,
            name,
            phone,
            profile_image
          ),
          subscription:subscriptions!orders_subscription_id_fkey(
            id,
            subscription_type,
            product:products(
              id,
              name,
              image_url
            )
          )
        `)
        .eq('delivery_date', today)
        .not('subscription_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching today\'s subscription deliveries:', error);
        throw error;
      }

      return data;
    },
    enabled: !!userId,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
};
