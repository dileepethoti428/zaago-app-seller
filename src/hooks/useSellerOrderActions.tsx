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
    action: 'accept' | 'reject' | 'pack'
  ) => {
    if (isProcessing) return false;

    setIsProcessing(orderId);

    // Optimistic update - immediately update UI state
    const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'packed';
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
      
      // Check if it's a location-related error and provide specific guidance
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} order`;
      const isLocationError = errorMessage.includes('location') || 
                             errorMessage.includes('latitude') || 
                             errorMessage.includes('longitude') ||
                             errorMessage.includes('Please set your location in settings');
      
      toast({
        title: isLocationError ? "Location Required" : "Error",
        description: isLocationError 
          ? "Please set your store location in Settings before packing orders. Click Settings → Location to set up your location."
          : errorMessage,
        variant: "destructive",
        duration: isLocationError ? 8000 : 5000
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

  return {
    acceptOrder,
    rejectOrder,
    packOrder,
    isProcessing,
    getOptimisticStatus
  };
};