import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';
import { getNextDeliveryDateIST } from '@/utils/subscriptionDateCalculator';

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

export const useUpdateSubscriptionCustomer = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriptionId, customerId }: { subscriptionId: string; customerId: string }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ customer_id: customerId })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-subscriptions'] });
      toast({
        title: 'Success',
        description: 'Customer updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error updating subscription customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update customer',
      });
    },
  });
};
