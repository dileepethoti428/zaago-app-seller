import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface RestockItem {
  id: string;
  product_id: string;
  suggested_quantity: number;
  notes: string | null;
  is_purchased: boolean;
  created_at: string;
  products?: {
    name: string;
    unit: string;
  };
}

export const useRestockList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: restockList = [], isLoading, error } = useQuery({
    queryKey: ['restock-list', user?.id],
    queryFn: async (): Promise<RestockItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('seller_restock_list')
        .select(`
          id,
          product_id,
          suggested_quantity,
          notes,
          is_purchased,
          created_at,
          products(name, unit)
        `)
        .eq('seller_id', user.id)
        .eq('is_purchased', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as RestockItem[];
    },
    enabled: !!user?.id,
  });

  const addToListMutation = useMutation({
    mutationFn: async ({ productId, quantity, notes }: { productId: string; quantity: number; notes?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('seller_restock_list')
        .upsert({
          seller_id: user.id,
          product_id: productId,
          suggested_quantity: quantity,
          notes: notes || null,
          is_purchased: false,
        }, {
          onConflict: 'seller_id,product_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restock-list', user?.id] });
      toast.success('Added to purchase list');
    },
    onError: (error: any) => {
      console.error('Error adding to restock list:', error);
      toast.error('Failed to add to purchase list');
    },
  });

  const removeFromListMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('seller_restock_list')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restock-list', user?.id] });
      toast.success('Removed from purchase list');
    },
    onError: (error: any) => {
      console.error('Error removing from restock list:', error);
      toast.error('Failed to remove from purchase list');
    },
  });

  const markAsPurchasedMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('seller_restock_list')
        .update({ is_purchased: true })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restock-list', user?.id] });
      toast.success('Marked as purchased');
    },
    onError: (error: any) => {
      console.error('Error marking as purchased:', error);
      toast.error('Failed to update');
    },
  });

  const isInList = (productId: string): boolean => {
    return restockList.some(item => item.product_id === productId);
  };

  return {
    restockList,
    isLoading,
    error,
    addToList: addToListMutation.mutate,
    removeFromList: removeFromListMutation.mutate,
    markAsPurchased: markAsPurchasedMutation.mutate,
    isInList,
    isAddingToList: addToListMutation.isPending,
  };
};
