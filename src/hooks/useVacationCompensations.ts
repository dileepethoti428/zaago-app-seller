import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, eachDayOfInterval } from 'date-fns';

export interface VacationCompensation {
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
  delivery_agent?: {
    id: string;
    name: string;
  } | null;
}

export interface VacationPeriod {
  id?: string;
  subscription_id?: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at?: string;
}

// Get all vacation dates for a subscription with their compensation status
export const useVacationDatesWithStatus = (subscriptionId: string | undefined, vacationPeriods: VacationPeriod[] | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vacation-dates-status', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId || !vacationPeriods || vacationPeriods.length === 0) {
        return [];
      }

      // Fetch existing compensations for this subscription
      const { data: compensations, error } = await supabase
        .from('vacation_compensations' as any)
        .select('*, delivery_agents(id, name)')
        .eq('subscription_id', subscriptionId);

      if (error) {
        console.error('Error fetching compensations:', error);
        throw error;
      }

      // Build a map of vacation dates to their compensation status
      const compensationMap = new Map<string, VacationCompensation>();
      (compensations || []).forEach((comp: any) => {
        compensationMap.set(comp.original_vacation_date, {
          ...comp,
          delivery_agent: comp.delivery_agents
        });
      });

      // Generate all vacation dates from all active vacation periods
      const allVacationDates: {
        date: string;
        vacationPeriodId: string;
        compensation: VacationCompensation | null;
        isPast: boolean;
      }[] = [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      vacationPeriods
        .filter(v => v.status === 'active')
        .forEach(period => {
          const startDate = parseISO(period.start_date);
          const endDate = parseISO(period.end_date);
          
          const dates = eachDayOfInterval({ start: startDate, end: endDate });
          
          dates.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            allVacationDates.push({
              date: dateStr,
              vacationPeriodId: period.id || '',
              compensation: compensationMap.get(dateStr) || null,
              isPast: date < today
            });
          });
        });

      return allVacationDates.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!subscriptionId && !!user?.id && !!vacationPeriods && vacationPeriods.length > 0,
  });
};

// Create a new vacation compensation
export const useCreateVacationCompensation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      vacationPeriodId,
      originalVacationDate,
      compensationDeliveryDate
    }: {
      subscriptionId: string;
      vacationPeriodId: string;
      originalVacationDate: string;
      compensationDeliveryDate: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .insert({
          subscription_id: subscriptionId,
          vacation_period_id: vacationPeriodId,
          original_vacation_date: originalVacationDate,
          compensation_delivery_date: compensationDeliveryDate,
          seller_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Compensation already exists for this vacation date');
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Compensation Assigned',
        description: `Extra delivery scheduled for ${format(parseISO(variables.compensationDeliveryDate), 'MMM d, yyyy')}`,
      });
      queryClient.invalidateQueries({ queryKey: ['vacation-dates-status', variables.subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create compensation',
        variant: 'destructive'
      });
    }
  });
};

// Assign an agent to a vacation compensation
export const useAssignCompensationAgent = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      compensationId,
      agentId,
      subscriptionId
    }: {
      compensationId: string;
      agentId: string;
      subscriptionId: string;
    }) => {
      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .update({
          assigned_agent_id: agentId,
          status: 'assigned'
        })
        .eq('id', compensationId)
        .select()
        .single();

      if (error) throw error;
      return { data, subscriptionId };
    },
    onSuccess: (result) => {
      toast({
        title: 'Agent Assigned',
        description: 'Delivery agent assigned to compensation delivery',
      });
      queryClient.invalidateQueries({ queryKey: ['vacation-dates-status', result.subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign agent',
        variant: 'destructive'
      });
    }
  });
};

// Get compensation deliveries for an agent
export const useAgentCompensationDeliveries = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-compensation-deliveries', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get the agent record for this user
      const { data: agent } = await supabase
        .from('delivery_agents')
        .select('id')
        .eq('agent_id', user.id)
        .maybeSingle();

      if (!agent) return [];

      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .select(`
          *,
          subscriptions!inner(
            id,
            quantity,
            delivery_address,
            products(id, name, image_url)
          )
        `)
        .eq('assigned_agent_id', agent.id)
        .eq('status', 'assigned')
        .gte('compensation_delivery_date', today)
        .order('compensation_delivery_date', { ascending: true });

      if (error) throw error;

      // Fetch customer info for each compensation
      const compensationsWithCustomers = await Promise.all(
        (data || []).map(async (comp: any) => {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('customer_id')
            .eq('id', comp.subscription_id)
            .single();

          if (subscription?.customer_id) {
            const { data: customer } = await supabase
              .from('customers')
              .select('full_name, phone, address')
              .eq('id', subscription.customer_id)
              .single();

            return { ...comp, customer };
          }
          return comp;
        })
      );

      return compensationsWithCustomers;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};
