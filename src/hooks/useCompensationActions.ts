import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Update compensation type
export const useUpdateCompensationType = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      compensationId,
      compensationType
    }: {
      compensationId: string;
      compensationType: 'extra_delivery' | 'refund' | 'credit';
    }) => {
      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .update({ compensation_type: compensationType })
        .eq('id', compensationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Type Updated',
        description: 'Compensation type has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update compensation type',
        variant: 'destructive'
      });
    }
  });
};

// Mark compensation as delivered
export const useMarkCompensationDelivered = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (compensationId: string) => {
      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', compensationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Delivered',
        description: 'Compensation has been marked as delivered',
      });
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark as delivered',
        variant: 'destructive'
      });
    }
  });
};

// Cancel compensation
export const useCancelCompensation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      compensationId,
      reason
    }: {
      compensationId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason
        })
        .eq('id', compensationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Cancelled',
        description: 'Compensation has been cancelled',
      });
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel compensation',
        variant: 'destructive'
      });
    }
  });
};

// Assign agent to compensation
export const useAssignAgentToCompensation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      compensationId,
      agentId,
      deliveryDate
    }: {
      compensationId: string;
      agentId: string;
      deliveryDate?: string;
    }) => {
      const updateData: any = {
        assigned_agent_id: agentId,
        status: 'assigned'
      };

      if (deliveryDate) {
        updateData.compensation_delivery_date = deliveryDate;
      }

      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .update(updateData)
        .eq('id', compensationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Agent Assigned',
        description: 'Delivery agent has been assigned to the compensation',
      });
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
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

// Set delivery date for compensation
export const useSetCompensationDeliveryDate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      compensationId,
      deliveryDate
    }: {
      compensationId: string;
      deliveryDate: string;
    }) => {
      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .update({ compensation_delivery_date: deliveryDate })
        .eq('id', compensationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Date Set',
        description: 'Compensation delivery date has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set delivery date',
        variant: 'destructive'
      });
    }
  });
};

// Add notes to compensation
export const useAddCompensationNotes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      compensationId,
      notes
    }: {
      compensationId: string;
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from('vacation_compensations' as any)
        .update({ notes })
        .eq('id', compensationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Notes Added',
        description: 'Notes have been saved',
      });
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add notes',
        variant: 'destructive'
      });
    }
  });
};
