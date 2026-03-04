import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useProductActions = () => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const acceptProduct = async (orderId: string, productId: string, sellerId: string) => {
    if (isProcessing) return false;

    setIsProcessing(`${orderId}-${productId}`);

    try {
      const { data, error } = await supabase.rpc('accept_product_in_order', {
        p_order_id: orderId,
        p_product_id: productId,
        p_seller_id: sellerId
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };

      if (result.success) {
        toast({
          title: "Product Accepted! ✅",
          description: result.message || 'Product accepted and delivery partner notified',
          variant: "default"
        });
        return true;
      } else {
        throw new Error(result.error || 'Failed to accept product');
      }
    } catch (error) {
      console.error('Error accepting product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to accept product',
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(null);
    }
  };

  const rejectProduct = async (orderId: string, productId: string, sellerId: string, reason?: string) => {
    if (isProcessing) return false;

    setIsProcessing(`${orderId}-${productId}`);

    try {
      const { data, error } = await supabase.rpc('reject_product_in_order', {
        p_order_id: orderId,
        p_product_id: productId,
        p_seller_id: sellerId,
        p_reason: reason
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };

      if (result.success) {
        toast({
          title: "Product Rejected",
          description: result.message || 'Product has been rejected',
          variant: "default"
        });
        return true;
      } else {
        throw new Error(result.error || 'Failed to reject product');
      }
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to reject product',
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(null);
    }
  };

  return {
    acceptProduct,
    rejectProduct,
    isProcessing
  };
};