import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO } from 'date-fns';
import { Database } from '@/integrations/supabase/types';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];

interface SubscriptionWithDetails extends Subscription {
  profiles: {
    full_name: string;
    phone: string;
  } | null;
  products: {
    name: string;
    price: number;
  } | null;
  vacation: {
    start_date: string;
    end_date: string;
    status: string;
  }[];
}

export const useSellerSubscriptions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['seller-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles!inner(full_name, phone),
          products!subscriptions_product_id_fkey(name, price),
          vacation:subscription_vacation_periods(start_date, end_date, status)
        `)
        .eq('products.seller_id', user.id)
        .eq('profiles.user_id', 'subscriptions.user_id')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch subscriptions',
        });
        throw error;
      }

      return (data || []) as unknown as SubscriptionWithDetails[];
    },
    enabled: !!user?.id,
  });
};

interface CreateSubscriptionData {
  customerId: string;
  productId: string;
  quantity: number;
  deliveryType: 'everyday' | 'weekend' | 'alternate';
  timeSlot: string;
  startDate: Date;
  endDate?: Date;
  address: any;
  specialInstructions?: string;
  vacationFrom?: Date;
  vacationTo?: Date;
}

const calculateNextDeliveryDate = (
  deliveryType: string,
  currentDate: Date
): Date => {
  switch (deliveryType) {
    case 'everyday':
      return addDays(currentDate, 1);
    case 'weekend':
      const nextDate = addDays(currentDate, 1);
      const dayOfWeek = nextDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return nextDate;
      }
      const daysUntilSaturday = 6 - dayOfWeek;
      return addDays(nextDate, daysUntilSaturday);
    case 'alternate':
      return addDays(currentDate, 2);
    default:
      return addDays(currentDate, 1);
  }
};

export const useCreateSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubscriptionData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const nextDeliveryDate = calculateNextDeliveryDate(
        data.deliveryType,
        data.startDate
      );

      const subscriptionData: Database['public']['Tables']['subscriptions']['Insert'] = {
        user_id: data.customerId,
        product_id: data.productId,
        subscription_type: data.deliveryType,
        delivery_time_slot: data.timeSlot,
        start_date: format(data.startDate, 'yyyy-MM-dd'),
        end_date: data.endDate ? format(data.endDate, 'yyyy-MM-dd') : null,
        next_delivery_date: format(nextDeliveryDate, 'yyyy-MM-dd'),
        delivery_address: data.address,
        is_active: true,
        quantity: data.quantity,
        special_instructions: data.specialInstructions || null,
      };

      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (subscriptionError) throw subscriptionError;

      // Add vacation period if provided
      if (data.vacationFrom && data.vacationTo && subscription) {
        const vacationData = {
          subscription_id: subscription.id,
          user_id: data.customerId,
          start_date: format(data.vacationFrom, 'yyyy-MM-dd'),
          end_date: format(data.vacationTo, 'yyyy-MM-dd'),
          status: 'active' as const,
        };

        const { error: vacationError } = await supabase
          .from('subscription_vacation_periods')
          .insert(vacationData);

        if (vacationError) {
          console.error('Error creating vacation period:', vacationError);
        }
      }

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      toast({
        title: 'Success',
        description: 'Subscription created successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error creating subscription:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create subscription',
      });
    },
  });
};

export const useAcceptSubscriptionDelivery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch subscription details
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !subscription) throw new Error('Subscription not found');

      // Create order from subscription - using the JSON items format from orders table
      const orderItems = [{
        product_id: subscription.product_id,
        quantity: subscription.quantity,
        price: 0 // Will be calculated by backend
      }];

      const orderData: OrderInsert = {
        user_id: subscription.user_id,
        address: subscription.delivery_address || {},
        items: orderItems as any,
        total: 0, // Will be calculated by backend
        tracking_id: `SUB-${subscriptionId.slice(0, 8)}-${Date.now()}`,
        status: 'accepted',
        delivery_date: subscription.next_delivery_date,
        delivery_time_slot: subscription.delivery_time_slot,
        subscription_id: subscriptionId,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Update next delivery date
      const nextDelivery = calculateNextDeliveryDate(
        subscription.subscription_type,
        parseISO(subscription.next_delivery_date)
      );

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ next_delivery_date: format(nextDelivery, 'yyyy-MM-dd') })
        .eq('id', subscriptionId);

      if (updateError) throw updateError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      toast({
        title: 'Success',
        description: 'Delivery accepted successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error accepting delivery:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to accept delivery',
      });
    },
  });
};

export const useRejectSubscriptionDelivery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch subscription details
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !subscription) throw new Error('Subscription not found');

      // Calculate next delivery date (skip current)
      const nextDelivery = calculateNextDeliveryDate(
        subscription.subscription_type,
        parseISO(subscription.next_delivery_date)
      );

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ next_delivery_date: format(nextDelivery, 'yyyy-MM-dd') })
        .eq('id', subscriptionId);

      if (updateError) throw updateError;

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      toast({
        title: 'Success',
        description: 'Delivery skipped successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error skipping delivery:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to skip delivery',
      });
    },
  });
};
