import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CreateCompensationParams {
  subscriptionId: string;
  customerId: string;
  productId: string;
  originalMissedDate: string;
  compensationDate: string;
  agentId: string;
  quantity: number;
  reason?: string;
}

export const useCreateCompensationOrder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCompensationParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Create vacation_compensations record
      const { data: compensation, error: compError } = await supabase
        .from('vacation_compensations')
        .insert({
          subscription_id: params.subscriptionId,
          customer_id: params.customerId,
          product_id: params.productId,
          original_vacation_date: params.originalMissedDate,
          compensation_delivery_date: params.compensationDate,
          assigned_agent_id: params.agentId,
          quantity: params.quantity,
          reason: params.reason || 'delivery_failed',
          status: 'pending',
          seller_id: user.id,
          compensation_type: 'extra_delivery',
        })
        .select()
        .single();

      if (compError) throw compError;

      // 2. Create daily_orders entry for the compensation date
      const { error: dailyError } = await supabase
        .from('daily_orders')
        .insert({
          subscription_id: params.subscriptionId,
          customer_id: params.customerId,
          date: params.compensationDate,
          quantity: params.quantity,
          status: 'pending',
          assigned_agent_id: params.agentId,
          assigned_by: 'seller_manual',
        });

      if (dailyError) {
        console.warn('Daily order creation failed (may already exist):', dailyError);
      }

      return compensation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-delivery-history'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-missed-counts'] });
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
      toast({
        title: 'Compensation Created',
        description: 'Compensation delivery has been scheduled successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating compensation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create compensation',
      });
    },
  });
};
