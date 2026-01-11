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
      address: string | null;
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
  vacation_period_id: string;
  original_vacation_date: string;
  compensation_delivery_date: string;
  seller_id: string;
  assigned_agent_id: string | null;
  status: 'pending' | 'assigned' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
  delivery_agent: {
    id: string;
    name: string;
  } | null;
  subscription: {
    id: string;
    quantity: number;
    delivery_address: unknown;
    customer: {
      id: string;
      full_name: string;
      phone: string;
    } | null;
    product: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface VacationSummary {
  totalActiveVacations: number;
  totalVacationDays: number;
  pendingCompensations: number;
  assignedCompensations: number;
  deliveredCompensations: number;
}

export const useAllVacationData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-vacation-data', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          vacationPeriods: [],
          compensations: [],
          summary: {
            totalActiveVacations: 0,
            totalVacationDays: 0,
            pendingCompensations: 0,
            assignedCompensations: 0,
            deliveredCompensations: 0,
          }
        };
      }

      // Fetch all active vacation periods with subscription details
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
              .select('id, full_name, phone, address')
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

      // Fetch all compensations
      const { data: compensations, error: compError } = await supabase
        .from('vacation_compensations' as any)
        .select('*, delivery_agents(id, name)')
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
              .select('id, full_name, phone')
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

      // Calculate summary
      const summary: VacationSummary = {
        totalActiveVacations: periodsWithDetails.length,
        totalVacationDays: periodsWithDetails.reduce((sum, p) => sum + p.total_days, 0),
        pendingCompensations: compensationsWithDetails.filter(c => c.status === 'pending').length,
        assignedCompensations: compensationsWithDetails.filter(c => c.status === 'assigned').length,
        deliveredCompensations: compensationsWithDetails.filter(c => c.status === 'delivered').length,
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
