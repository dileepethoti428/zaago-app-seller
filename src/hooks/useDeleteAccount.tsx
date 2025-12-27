import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface DeletionBlocker {
  type: 'active_orders' | 'pending_subscriptions';
  count: number;
  message: string;
}

interface UseDeleteAccountReturn {
  isLoading: boolean;
  isChecking: boolean;
  blockers: DeletionBlocker[];
  checkDeletionEligibility: () => Promise<boolean>;
  deleteAccount: (reason?: string) => Promise<boolean>;
}

export const useDeleteAccount = (): UseDeleteAccountReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [blockers, setBlockers] = useState<DeletionBlocker[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkDeletionEligibility = async (): Promise<boolean> => {
    setIsChecking(true);
    setBlockers([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete your account",
          variant: "destructive",
        });
        return false;
      }

      const newBlockers: DeletionBlocker[] = [];

      // Check for active orders (not delivered or cancelled)
      const { data: activeOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('seller_id', user.id)
        .in('status', ['pending', 'accepted', 'packed', 'out_for_delivery']);

      if (ordersError) {
        console.error('Error checking active orders:', ordersError);
      } else if (activeOrders && activeOrders.length > 0) {
        newBlockers.push({
          type: 'active_orders',
          count: activeOrders.length,
          message: `You have ${activeOrders.length} active order(s) that must be completed or cancelled before deletion.`,
        });
      }

      // Check for active subscriptions via products owned by this seller
      const { data: sellerProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user.id);

      if (!productsError && sellerProducts && sellerProducts.length > 0) {
        const productIds = sellerProducts.map(p => p.id);
        
        const { data: activeSubscriptions, error: subsError } = await supabase
          .from('subscriptions')
          .select('id')
          .in('product_id', productIds)
          .eq('status', 'active');

        if (subsError) {
          console.error('Error checking active subscriptions:', subsError);
        } else if (activeSubscriptions && activeSubscriptions.length > 0) {
          newBlockers.push({
            type: 'pending_subscriptions',
            count: activeSubscriptions.length,
            message: `You have ${activeSubscriptions.length} active subscription(s) that must be cancelled before deletion.`,
          });
        }
      }

      setBlockers(newBlockers);
      return newBlockers.length === 0;
    } catch (error) {
      console.error('Error checking deletion eligibility:', error);
      toast({
        title: "Error",
        description: "Failed to check account deletion eligibility",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const deleteAccount = async (reason?: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete your account",
          variant: "destructive",
        });
        return false;
      }

      // Step 1: Deactivate all products
      const { error: productsError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('seller_id', user.id);

      if (productsError) {
        console.error('Error deactivating products:', productsError);
      }

      // Step 2: Soft delete the seller account
      const { error: sellerError } = await supabase
        .from('sellers')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deletion_reason: reason || 'User requested account deletion',
          deletion_requested_by: user.id,
          status: 'deleted',
        })
        .eq('id', user.id);

      if (sellerError) {
        console.error('Error soft deleting seller:', sellerError);
        toast({
          title: "Error",
          description: "Failed to delete account. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Step 3: Sign out the user
      await supabase.auth.signOut();

      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted. You will be redirected to the login page.",
      });

      // Redirect to login page
      setTimeout(() => {
        navigate('/login');
      }, 1500);

      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isChecking,
    blockers,
    checkDeletionEligibility,
    deleteAccount,
  };
};
