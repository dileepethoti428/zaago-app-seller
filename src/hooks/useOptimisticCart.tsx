import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { queueCartUpdate } from '@/lib/backgroundSync';
import { useNetworkStatus } from '@/lib/network';

interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  // Extended properties for UI
  product_name?: string;
  product_image_url?: string;
  seller_id?: string;
  variant_id?: string;
  variant_name?: string;
  variant_value?: string;
}

export const useOptimisticCart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();

  // Query for cart items
  const cartQuery = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async (): Promise<CartItem[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  // Optimistic add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (params: {
      product: any;
      quantity: number;
      variant?: any;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const price = params.product.discounted_price || params.product.price;
      const cartItem = {
        user_id: user.id,
        product_id: params.product.id,
        quantity: params.quantity,
        unit_price: price,
        total_price: price * params.quantity,
        // Extended properties for UI
        product_name: params.product.name,
        product_image_url: params.product.image_url,
        seller_id: params.product.seller_id,
        variant_id: params.variant?.id,
        variant_name: params.variant?.variant_name,
        variant_value: params.variant?.variant_value,
      };

      if (isOnline) {
        const { data, error } = await supabase
          .from('cart_items')
          .upsert(cartItem as any)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Queue for background sync
        queueCartUpdate('add', cartItem);
        return { ...cartItem, id: `temp_${Date.now()}` };
      }
    },
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cart', user?.id] });

      // Snapshot the previous value
      const previousCart = queryClient.getQueryData<CartItem[]>(['cart', user?.id]);

      // Optimistically update the cache
      const price = params.product.discounted_price || params.product.price;
      const optimisticItem: CartItem = {
        id: `optimistic_${Date.now()}`,
        user_id: user!.id,
        product_id: params.product.id,
        quantity: params.quantity,
        unit_price: price,
        total_price: price * params.quantity,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Extended properties for UI
        product_name: params.product.name,
        product_image_url: params.product.image_url,
        seller_id: params.product.seller_id,
        variant_id: params.variant?.id,
        variant_name: params.variant?.variant_name,
        variant_value: params.variant?.variant_value,
      };

      queryClient.setQueryData<CartItem[]>(
        ['cart', user?.id],
        (old) => [optimisticItem, ...(old || [])]
      );

      return { previousCart };
    },
    onError: (err, params, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', user?.id], context.previousCart);
      }
      
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Refetch to get the real data
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      
      toast({
        title: "Success",
        description: "Item added to cart",
      });
    },
  });

  // Optimistic remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      if (isOnline) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', cartItemId);

        if (error) throw error;
      } else {
        // Queue for background sync
        queueCartUpdate('remove', { id: cartItemId });
      }
    },
    onMutate: async (cartItemId) => {
      await queryClient.cancelQueries({ queryKey: ['cart', user?.id] });

      const previousCart = queryClient.getQueryData<CartItem[]>(['cart', user?.id]);

      queryClient.setQueryData<CartItem[]>(
        ['cart', user?.id],
        (old) => old?.filter(item => item.id !== cartItemId) || []
      );

      return { previousCart };
    },
    onError: (err, cartItemId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', user?.id], context.previousCart);
      }
      
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      
      toast({
        title: "Success",
        description: "Item removed from cart",
      });
    },
  });

  // Optimistic update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async (params: { cartItemId: string; quantity: number }) => {
      if (isOnline) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: params.quantity })
          .eq('id', params.cartItemId);

        if (error) throw error;
      } else {
        // Queue for background sync
        queueCartUpdate('update', {
          id: params.cartItemId,
          updates: { quantity: params.quantity }
        });
      }
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ['cart', user?.id] });

      const previousCart = queryClient.getQueryData<CartItem[]>(['cart', user?.id]);

      queryClient.setQueryData<CartItem[]>(
        ['cart', user?.id],
        (old) => old?.map(item => 
          item.id === params.cartItemId 
            ? { ...item, quantity: params.quantity }
            : item
        ) || []
      );

      return { previousCart };
    },
    onError: (err, params, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', user?.id], context.previousCart);
      }
      
      toast({
        title: "Error",
        description: "Failed to update item quantity",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
    },
  });

  const cartItems = cartQuery.data || [];
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + item.total_price;
  }, 0);

  return {
    cartItems,
    totalItems,
    totalPrice,
    isLoading: cartQuery.isLoading,
    error: cartQuery.error,
    addToCart: addToCartMutation.mutate,
    removeFromCart: removeFromCartMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    isAddingToCart: addToCartMutation.isPending,
    isRemovingFromCart: removeFromCartMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
  };
};