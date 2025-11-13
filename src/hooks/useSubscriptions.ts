import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { getNextDeliveryDateIST, skipVacationDates } from '@/utils/subscriptionDateCalculator';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];

interface SubscriptionWithDetails extends Subscription {
  customers: {
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
  profiles?: {
    full_name: string;
    phone: string;
    email: string | null;
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
  customer_info?: {
    full_name: string;
    phone: string;
    email: string;
  };
}

export const useSellerSubscriptions = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['seller-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Step 1: Fetch seller's product IDs FIRST
      const { data: sellerProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user.id);

      if (productsError) {
        console.error('Error fetching seller products:', productsError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch seller products',
        });
        throw productsError;
      }

      // If seller has no products, return empty array
      if (!sellerProducts || sellerProducts.length === 0) {
        return [];
      }

      // Extract product IDs
      const productIds = sellerProducts.map(p => p.id);

      // Step 2: Fetch subscriptions with explicit product_id filtering
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          products!subscriptions_product_id_fkey(name, price, seller_id),
          vacation:subscription_vacation_periods(start_date, end_date, status)
        `)
        .in('product_id', productIds)
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

      if (!subscriptions || subscriptions.length === 0) {
        return [];
      }

      // Step 3: Fetch all unique customers (using customer_id, fallback to user_id for old data)
      const customerIds = [...new Set(subscriptions.map(s => s.customer_id).filter(Boolean))];
      const userIds = [...new Set(subscriptions.map(s => !s.customer_id && s.user_id).filter(Boolean))];
      
      let customerMap = new Map();
      let profileMap = new Map();

      // Fetch from customers table
      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, full_name, phone, email')
          .in('id', customerIds);

        if (customersError) {
          console.error('Error fetching customers:', customersError);
        }

        if (customersData) {
          customersData.forEach(c => customerMap.set(c.id, c));
        }
      }

      // Fetch from profiles for legacy data
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        if (profileError) {
          console.error('Error fetching profiles:', profileError);
        }

        if (profiles) {
          profiles.forEach(p => profileMap.set(p.user_id, { ...p, email: null }));
        }
      }

      // Step 4: Merge customer data into subscriptions with computed customer_info
      const enrichedData = subscriptions.map(sub => {
        const customerData = customerMap.get(sub.customer_id);
        const profileData = profileMap.get(sub.user_id);
        
        return {
          ...sub,
          customers: customerData || null,
          profiles: profileData || null,
          customer_info: {
            full_name: customerData?.full_name || profileData?.full_name || 'Unknown Customer',
            phone: customerData?.phone || profileData?.phone || '',
            email: customerData?.email || profileData?.email || '',
          }
        };
      });

      return enrichedData as unknown as SubscriptionWithDetails[];
    },
    enabled: !!user?.id,
  });
};

export const useSubscriptionDeliveryStatus = (subscriptionId: string, deliveryDate: string) => {
  return useQuery({
    queryKey: ['subscription-delivery-status', subscriptionId, deliveryDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, delivery_date, created_at')
        .eq('subscription_id', subscriptionId)
        .eq('delivery_date', deliveryDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!subscriptionId && !!deliveryDate,
  });
};

export interface CreateSubscriptionData {
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
  source?: 'seller_manual' | 'customer_app';
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
        // For seller-created: customer_id from customers table, user_id is null
        // For customer-created: both set (customer auto-created)
        customer_id: data.customerId,
        user_id: data.source === 'seller_manual' ? null : data.customerId,
        created_by: user.id,
        source: data.source || 'seller_manual',
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
        accepted_at: new Date().toISOString(), // Timestamp when seller accepted
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

      // Fetch vacation periods
      const { data: vacations } = await supabase
        .from('subscription_vacation_periods')
        .select('start_date, end_date, status')
        .eq('subscription_id', subscriptionId)
        .eq('status', 'active');

      // Calculate next delivery skipping vacations - always tomorrow in IST
      const nextDelivery = getNextDeliveryDateIST(vacations || []);

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

      // Fetch vacation periods
      const { data: vacations } = await supabase
        .from('subscription_vacation_periods')
        .select('start_date, end_date, status')
        .eq('subscription_id', subscriptionId)
        .eq('status', 'active');

      // Calculate next delivery skipping vacations - always tomorrow in IST
      const nextDelivery = getNextDeliveryDateIST(vacations || []);

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
