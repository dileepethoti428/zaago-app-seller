import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveredDayDetails {
  completedAt: string | null;
  slot: string | null;
  agentName: string | null;
  agentPhone: string | null;
  agentVehicle: string | null;
}

/**
 * Fetches completion info for a delivered subscription day.
 * delivery_history.order_id maps to daily_orders.id for subscription deliveries.
 */
export const useDeliveredDayDetails = (
  dailyOrderId: string | null,
  subscriptionId: string | null
) => {
  return useQuery({
    queryKey: ['delivered-day-details', dailyOrderId, subscriptionId],
    queryFn: async (): Promise<DeliveredDayDetails> => {
      let completedAt: string | null = null;
      let slot: string | null = null;
      let agentId: string | null = null;

      if (dailyOrderId) {
        const { data } = await supabase
          .from('delivery_history')
          .select('completed_at, delivery_time_slot, agent_id')
          .eq('order_id', dailyOrderId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          completedAt = data.completed_at;
          slot = data.delivery_time_slot;
          agentId = data.agent_id;
        }
      }

      // Fallback: assigned agent on the daily order
      if (!agentId && dailyOrderId) {
        const { data: dailyOrder } = await supabase
          .from('daily_orders')
          .select('assigned_agent_id')
          .eq('id', dailyOrderId)
          .maybeSingle();
        agentId = dailyOrder?.assigned_agent_id || null;
      }

      // Slot comes from the subscription when not recorded on the delivery
      if (!slot && subscriptionId) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('delivery_time_slot')
          .eq('id', subscriptionId)
          .maybeSingle();
        slot = sub?.delivery_time_slot || null;
      }

      let agentName: string | null = null;
      let agentPhone: string | null = null;
      let agentVehicle: string | null = null;

      if (agentId) {
        const { data: agent } = await supabase
          .from('delivery_agents')
          .select('name, phone, vehicle_type')
          .eq('id', agentId)
          .maybeSingle();

        if (agent) {
          agentName = agent.name;
          agentPhone = agent.phone;
          agentVehicle = agent.vehicle_type;
        } else {
          // Some tables store the agent's user id instead of the agent row id
          const { data: byUser } = await supabase
            .from('delivery_agents')
            .select('name, phone, vehicle_type')
            .eq('agent_id', agentId)
            .maybeSingle();
          if (byUser) {
            agentName = byUser.name;
            agentPhone = byUser.phone;
            agentVehicle = byUser.vehicle_type;
          }
        }
      }

      return { completedAt, slot, agentName, agentPhone, agentVehicle };
    },
    enabled: !!dailyOrderId || !!subscriptionId,
  });
};
