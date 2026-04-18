import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Helper to sanitize numeric values - never send empty strings to integer/numeric columns
const sanitizeNumericField = (value: any): number | null => {
  if (value === '' || value === undefined || value === null) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

// Helper to clean update payload - removes empty strings for numeric fields
const cleanOrderPayload = (payload: Record<string, any>): Record<string, any> => {
  const numericFields = ['notification_count', 'distance_km', 'delivery_payout', 'otp_attempts'];
  const cleaned = { ...payload };
  
  numericFields.forEach(field => {
    if (field in cleaned) {
      cleaned[field] = sanitizeNumericField(cleaned[field]);
    }
  });
  
  return cleaned;
};

export const useSellerOrderActions = () => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const handleOrderAction = async (
    orderId: string, 
    sellerUserId: string, 
    action: 'accept' | 'reject' | 'pack' | 'notify_agents'
  ) => {
    if (isProcessing) return false;

    setIsProcessing(orderId);

    // For accept action, handle visibility window logic
    if (action === 'accept') {
      try {
        // Get order details to check visible_until
        const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('visible_until, status, subscription_id')
          .eq('id', orderId)
          .single();

        if (fetchError) throw fetchError;

        const now = new Date();
        const visibleUntil = order.visible_until ? new Date(order.visible_until) : null;
        const isLate = visibleUntil && now > visibleUntil;

        // Set status directly to 'packed' - skip accepted status
        const newStatus = 'packed';

        // Update order with acceptance details and directly set to packed
        const updatePayload = cleanOrderPayload({
          status: newStatus,
          seller_accepted_at: now.toISOString(),
          accepted_at: now.toISOString(),
          packed_at: now.toISOString(),
          visible: false,
          acceptance_window_expired: false,
          updated_at: now.toISOString()
        });

        console.log('Accept order update payload:', JSON.stringify(updatePayload, null, 2));

        const { error: updateError } = await supabase
          .from('orders')
          .update(updatePayload as any)
          .eq('id', orderId);

        if (updateError) throw updateError;

        // Log seller acceptance (still track if it was late)
        await supabase.from('order_visibility_logs').insert({
          order_id: orderId,
          event_type: isLate ? 'late_acceptance_packed' : 'accepted_packed',
          status_before: order.status,
          status_after: newStatus,
          visible_until: order.visible_until,
          acceptance_time: now.toISOString(),
          metadata: {
            is_late: isLate,
            direct_to_packed: true,
            time_diff_minutes: visibleUntil ? Math.floor((now.getTime() - visibleUntil.getTime()) / (1000 * 60)) : 0
          }
        });

        // Show late acceptance warning if applicable
        if (isLate) {
          toast({
            title: "Late Acceptance",
            description: "Order accepted and packed. Operations team has been notified.",
            variant: "default"
          });

          // Notify ops about late acceptance
          await supabase.from('admin_notifications').insert({
            title: 'Late Order Acceptance',
            message: `Order ${orderId} was accepted after the deadline by seller.`,
            type: 'late_acceptance',
            metadata: {
              order_id: orderId,
              visible_until: order.visible_until,
              accepted_at: now.toISOString()
            }
          });
        } else {
          toast({
            title: "Success",
            description: "Order accepted and packed successfully",
            variant: "default"
          });
        }

        // Confirm the update - status is now 'packed'
        window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
          detail: { orderId, action, status: newStatus, confirmed: true } 
        }));

        return true;
      } catch (error) {
        console.error('Error accepting order:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to accept order",
          variant: "destructive"
        });
        return false;
      } finally {
        setIsProcessing(null);
      }
    }

    // For other actions (reject, pack, notify_agents), use original logic
    // Optimistic update - immediately update UI state
    const newStatus = action === 'reject' ? 'rejected' : 
                      action === 'pack' ? 'packed' : 'assigned';
    setOptimisticUpdates(prev => ({ ...prev, [orderId]: newStatus }));

    // Immediately dispatch event for UI update
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
      detail: { orderId, action, status: newStatus, optimistic: true } 
    }));

    try {
      // Use simpler function for pack action
      if (action === 'pack') {
        const { data, error } = await supabase.rpc('mark_order_as_packed_simple', {
          order_id: orderId
        });

        if (error) throw error;

        const result = data as { success: boolean; message?: string; error?: string };

        if (result.success) {
          // Clear optimistic update since real update succeeded
          setOptimisticUpdates(prev => {
            const updated = { ...prev };
            delete updated[orderId];
            return updated;
          });

          toast({
            title: "Success",
            description: result.message || 'Order packed successfully',
            variant: "default"
          });
          
          // Confirm the update with real data
          window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
            detail: { orderId, action, status: newStatus, confirmed: true } 
          }));
          
          return true;
        } else {
          throw new Error(result.error || 'Failed to pack order');
        }
      }

      // For other actions, use the original function
      const { data, error } = await supabase.rpc('update_seller_order_status', {
        p_order_id: orderId,
        p_seller_user_id: sellerUserId,
        p_action: action
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };

      if (result.success) {
        // Clear optimistic update since real update succeeded
        setOptimisticUpdates(prev => {
          const updated = { ...prev };
          delete updated[orderId];
          return updated;
        });

        toast({
          title: "Success",
          description: result.message || `Order ${action}ed successfully`,
          variant: "default"
        });
        
        // Confirm the update with real data
        window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
          detail: { orderId, action, status: newStatus, confirmed: true } 
        }));
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });

      // Revert UI
      window.dispatchEvent(new CustomEvent('orderStatusReverted', { 
        detail: { orderId, action } 
      }));
      
      // Enhanced error handling with specific feedback
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} order`;
      
      // Check for specific error types
      const isLocationError = errorMessage.includes('location') || 
                             errorMessage.includes('latitude') || 
                             errorMessage.includes('longitude') ||
                             errorMessage.includes('Please set your location in settings');
      
      const isNotFoundError = errorMessage.includes('not found');
      const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('unauthorized');
      
      let title = "Error";
      let description = errorMessage;
      let duration = 5000;
      
      if (isLocationError) {
        title = "Location Required";
        description = "Please set your store location in Settings before packing orders. Click Settings → Location to set up your location.";
        duration = 8000;
      } else if (isNotFoundError) {
        title = "Order Not Found";
        description = "This order could not be found. It may have been cancelled or completed by another user.";
        duration = 6000;
      } else if (isPermissionError) {
        title = "Permission Denied";
        description = "You don't have permission to perform this action on this order.";
        duration = 6000;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration
      });
      return false;
    } finally {
      setIsProcessing(null);
    }
  };

  const getOptimisticStatus = (orderId: string) => {
    return optimisticUpdates[orderId];
  };

  const acceptOrder = (orderId: string, sellerUserId: string) => 
    handleOrderAction(orderId, sellerUserId, 'accept');

  const rejectOrder = (orderId: string, sellerUserId: string) => 
    handleOrderAction(orderId, sellerUserId, 'reject');

  const packOrder = (orderId: string, sellerUserId: string) => 
    handleOrderAction(orderId, sellerUserId, 'pack');

  const notifyDeliveryAgents = (orderId: string, sellerUserId: string) => 
    handleOrderAction(orderId, sellerUserId, 'notify_agents');

  return {
    acceptOrder,
    rejectOrder,
    packOrder,
    notifyDeliveryAgents,
    isProcessing,
    getOptimisticStatus
  };
};