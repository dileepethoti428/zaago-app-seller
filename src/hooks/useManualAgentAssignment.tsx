// ============================================================================
// MANUAL AGENT ASSIGNMENT HOOKS
// ============================================================================
// ⚠️ SAFETY RULES (CRITICAL):
// - Manual assignment is ONLY for overflow/unassigned orders
// - Assignments MUST respect agent's location_id
// - Assignments MUST respect agent's max_capacity
// - Sellers CANNOT change delivery dates through this
// - Sellers CANNOT regenerate orders or override cron automation
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignOrderParams {
  orderId: string;
  agentId: string;
}

/**
 * Hook to manually assign an unassigned/overflow order to a delivery agent.
 * ⚠️ SAFETY: Only for overflow orders. Agent must be from same location.
 */
export function useAssignOrderToAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, agentId }: AssignOrderParams) => {
      const { data, error } = await supabase
        .from('daily_orders')
        .update({ assigned_agent_id: agentId })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-capacity'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['daily-orders-counts'] });
      queryClient.invalidateQueries({ queryKey: ['debug-daily-orders-today'] });
      queryClient.invalidateQueries({ queryKey: ['debug-daily-orders-tomorrow'] });
      toast.success('Order assigned successfully');
    },
    onError: (error) => {
      console.error('Error assigning order:', error);
      toast.error('Failed to assign order');
    },
  });
}

interface CreateAgentParams {
  name: string;
  email: string;
  phone?: string;
  locationId: number;
  maxCapacity: number;
}

export function useCreateDeliveryAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, email, phone, locationId, maxCapacity }: CreateAgentParams) => {
      // Generate a unique agent_id (this would normally come from auth)
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('delivery_agents')
        .insert({
          agent_id: agentId,
          name,
          email,
          phone: phone || null,
          location_id: locationId,
          max_capacity: maxCapacity,
          is_active: true,
          is_online: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-capacity'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-agents-list'] });
      queryClient.invalidateQueries({ queryKey: ['daily-orders-counts'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      toast.success('Delivery partner created successfully');
    },
    onError: (error) => {
      console.error('Error creating delivery agent:', error);
      toast.error('Failed to create delivery partner');
    },
  });
}
