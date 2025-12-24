// ============================================================================
// SUBSCRIPTION DELIVERY ACTIONS HOOK
// ============================================================================
// ⚠️ SAFETY RULES (CRITICAL):
// - Sellers can ONLY accept or skip deliveries
// - Sellers CANNOT change delivery dates directly
// - Sellers CANNOT regenerate orders
// - Sellers CANNOT override cron job automation
// - All date calculations are handled server-side
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeliveryActionParams {
  orderId: string;
  subscriptionId: string;
  action: 'accept' | 'skip';
}

/**
 * Hook for seller to accept or skip subscription deliveries.
 * ⚠️ SAFETY: Only allows accept/skip. No date changes. Server handles automation.
 */
export const useSubscriptionDeliveryActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAction = async ({ orderId, subscriptionId, action }: DeliveryActionParams) => {
    const { data, error } = await supabase.functions.invoke(
      'handle-subscription-delivery-action',
      {
        body: { orderId, subscriptionId, action }
      }
    );

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Failed to process action');
    
    return data;
  };

  const mutation = useMutation({
    mutationFn: handleAction,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['today-subscription-order'] });
      
      if (variables.action === 'accept') {
        toast({
          title: 'Delivery Accepted',
          description: data.assigned 
            ? 'Order has been accepted, assigned to delivery agent, and marked as packed.'
            : 'Order has been accepted and will be assigned when an agent comes online.',
        });
      } else {
        toast({
          title: 'Delivery Skipped',
          description: `Delivery skipped. Customer notified. Next delivery: ${data.new_delivery_date}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process action',
        variant: 'destructive'
      });
    }
  });

  return {
    acceptDelivery: (orderId: string, subscriptionId: string) => 
      mutation.mutate({ orderId, subscriptionId, action: 'accept' }),
    skipDelivery: (orderId: string, subscriptionId: string) => 
      mutation.mutate({ orderId, subscriptionId, action: 'skip' }),
    isProcessing: mutation.isPending
  };
};
