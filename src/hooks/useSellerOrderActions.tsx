import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

    // Optimistic update - immediately update UI state
    const newStatus = action === 'accept' ? 'accepted' : 
                      action === 'reject' ? 'rejected' : 
                      action === 'pack' ? 'packed' : 'assigned';
    setOptimisticUpdates(prev => ({ ...prev, [orderId]: newStatus }));

    // Immediately dispatch event for UI update
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', { 
      detail: { orderId, action, status: newStatus, optimistic: true } 
    }));

    try {
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