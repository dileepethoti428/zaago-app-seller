import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, parseISO, eachDayOfInterval } from 'date-fns';

export interface VacationPeriodWithSubscription {
  id: string;
  subscription_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  created_at: string;
  subscription: {
    id: string;
    quantity: number;
    delivery_address: unknown;
    customer: {
      id: string;
      full_name: string;
      phone: string;
      email: string | null;
      address: string | null;
      city: string | null;
      pincode: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
    product: {
      id: string;
      name: string;
      image_url: string | null;
    } | null;
  } | null;
}

export interface VacationCompensationWithDetails {
  id: string;
  subscription_id: string;
  vacation_period_id: string | null;
  order_id: string | null;
  daily_order_id: string | null;
  customer_id: string | null;
  product_id: string | null;
  original_vacation_date: string;
  compensation_delivery_date: string | null;
  seller_id: string;
  assigned_agent_id: string | null;
  status: 'pending' | 'assigned' | 'delivered' | 'cancelled';
  reason: 'vacation' | 'technical_error' | 'delivery_failed' | 'agent_issue' | 'seller_failure';
  compensation_type: 'extra_delivery' | 'refund' | 'credit';
  quantity: number;
  notes: string | null;
  delivery_failed_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  delivery_agent: {
    id: string;
    name: string;
    phone: string | null;
    profile_image: string | null;
    vehicle_type: string | null;
    vehicle_number: string | null;
    average_rating: number | null;
    total_deliveries: number | null;
    is_online: boolean | null;
    performance_score: number | null;
  } | null;
  subscription: {
    id: string;
    quantity: number;
    delivery_address: unknown;
    customer: {
      id: string;
      full_name: string;
      phone: string;
      email: string | null;
      address: string | null;
      city: string | null;
      pincode: string | null;
    } | null;
    product: {
      id: string;
      name: string;
      image_url: string | null;
    } | null;
  } | null;
}

export interface VacationSummary {
  totalActiveVacations: number;
  totalVacationDays: number;
  pendingCompensations: number;
  assignedCompensations: number;
  deliveredCompensations: number;
  // New counts by reason
  vacationCount: number;
  deliveryFailedCount: number;
  agentIssueCount: number;
  technicalErrorCount: number;
}

export const useAllVacationData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-vacation-data', user?.id],
    queryFn: async (): Promise<{
      vacationPeriods: VacationPeriodWithSubscription[];
      compensations: VacationCompensationWithDetails[];
      summary: VacationSummary;
    }> => {
      const emptyResult = {
        vacationPeriods: [] as VacationPeriodWithSubscription[],
        compensations: [] as VacationCompensationWithDetails[],
        summary: {
          totalActiveVacations: 0,
          totalVacationDays: 0,
          pendingCompensations: 0,
          assignedCompensations: 0,
          deliveredCompensations: 0,
          vacationCount: 0,
          deliveryFailedCount: 0,
          agentIssueCount: 0,
          technicalErrorCount: 0,
        }
      };

      if (!user?.id) {
        return emptyResult;
      }

      // First, get seller's product IDs
      const { data: sellerProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user.id);

      if (productsError) {
        console.error('Error fetching seller products:', productsError);
        throw productsError;
      }

      const sellerProductIds = (sellerProducts || []).map(p => p.id);

      // If seller has no products, return empty data
      if (sellerProductIds.length === 0) {
        return emptyResult;
      }

      // Get subscriptions for seller's products
      const { data: sellerSubscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('id')
        .in('product_id', sellerProductIds);

      if (subError) {
        console.error('Error fetching seller subscriptions:', subError);
        throw subError;
      }

      const sellerSubscriptionIds = (sellerSubscriptions || []).map(s => s.id);

      // If no subscriptions, return empty data
      if (sellerSubscriptionIds.length === 0) {
        return emptyResult;
      }

      // Fetch vacation periods only for seller's subscriptions
      const { data: vacationPeriods, error: vpError } = await supabase
        .from('subscription_vacation_periods')
        .select(`
          id,
          subscription_id,
          start_date,
          end_date,
          total_days,
          status,
          created_at
        `)
        .eq('status', 'active')
        .in('subscription_id', sellerSubscriptionIds)
        .order('start_date', { ascending: true });

      if (vpError) {
        console.error('Error fetching vacation periods:', vpError);
        throw vpError;
      }

      // Fetch subscription details for each vacation period
      const periodsWithDetails: VacationPeriodWithSubscription[] = await Promise.all(
        (vacationPeriods || []).map(async (period) => {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select(`
              id,
              quantity,
              delivery_address,
              customer_id,
              product_id
            `)
            .eq('id', period.subscription_id)
            .single();

          let customer = null;
          let product = null;

          if (subscription?.customer_id) {
            const { data: customerData } = await supabase
              .from('customers')
              .select('id, full_name, phone, email, address, city, pincode, latitude, longitude')
              .eq('id', subscription.customer_id)
              .single();
            customer = customerData;
          }

          if (subscription?.product_id) {
            const { data: productData } = await supabase
              .from('products')
              .select('id, name, image_url')
              .eq('id', subscription.product_id)
              .single();
            product = productData;
          }

          return {
            ...period,
            subscription: subscription ? {
              id: subscription.id,
              quantity: subscription.quantity,
              delivery_address: subscription.delivery_address,
              customer,
              product
            } : null
          };
        })
      );

      // Fetch compensations only for this seller (including new columns)
      const { data: compensations, error: compError } = await supabase
        .from('vacation_compensations' as any)
        .select('*, delivery_agents(id, name, phone, profile_image, vehicle_type, vehicle_number, average_rating, total_deliveries, is_online, performance_score)')
        .eq('seller_id', user.id)
        .neq('status', 'cancelled')
        .order('compensation_delivery_date', { ascending: true });

      if (compError) {
        console.error('Error fetching compensations:', compError);
        throw compError;
      }

      // Fetch subscription details for each compensation
      const compensationsWithDetails: VacationCompensationWithDetails[] = await Promise.all(
        (compensations || []).map(async (comp: any) => {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select(`
              id,
              quantity,
              delivery_address,
              customer_id,
              product_id
            `)
            .eq('id', comp.subscription_id)
            .single();

          let customer = null;
          let product = null;

          if (subscription?.customer_id) {
            const { data: customerData } = await supabase
              .from('customers')
              .select('id, full_name, phone, email, address, city, pincode')
              .eq('id', subscription.customer_id)
              .single();
            customer = customerData;
          }

          if (subscription?.product_id) {
            const { data: productData } = await supabase
              .from('products')
              .select('id, name')
              .eq('id', subscription.product_id)
              .single();
            product = productData;
          }

          return {
            ...comp,
            delivery_agent: comp.delivery_agents,
            subscription: subscription ? {
              id: subscription.id,
              quantity: subscription.quantity,
              delivery_address: subscription.delivery_address,
              customer,
              product
            } : null
          };
        })
      );

      // Calculate summary with reason counts
      const summary: VacationSummary = {
        totalActiveVacations: periodsWithDetails.length,
        totalVacationDays: periodsWithDetails.reduce((sum, p) => sum + p.total_days, 0),
        pendingCompensations: compensationsWithDetails.filter(c => c.status === 'pending').length,
        assignedCompensations: compensationsWithDetails.filter(c => c.status === 'assigned').length,
        deliveredCompensations: compensationsWithDetails.filter(c => c.status === 'delivered').length,
        // Counts by reason
        vacationCount: compensationsWithDetails.filter(c => c.reason === 'vacation').length,
        deliveryFailedCount: compensationsWithDetails.filter(c => c.reason === 'delivery_failed').length,
        agentIssueCount: compensationsWithDetails.filter(c => c.reason === 'agent_issue').length,
        technicalErrorCount: compensationsWithDetails.filter(c => c.reason === 'technical_error').length,
      };

      return {
        vacationPeriods: periodsWithDetails,
        compensations: compensationsWithDetails,
        summary
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};
