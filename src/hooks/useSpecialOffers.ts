import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SpecialOffer {
  id: string;
  product_id: string;
  offer_title: string;
  offer_description: string | null;
  discount_percentage: number;
  original_price: number;
  offer_price: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  max_quantity_per_user: number | null;
  total_quantity_available: number | null;
  quantity_sold: number;
  offer_type: string;
  priority_rank: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  products?: {
    name: string;
    image_url: string | null;
    stock_quantity: number;
  };
}

export interface CreateOfferInput {
  product_id: string;
  discount_percentage: number;
  valid_from: string;
  valid_until: string;
  priority_rank: number;
  offer_title?: string;
  offer_description?: string;
  max_quantity_per_user?: number;
  total_quantity_available?: number;
}

export const useSellerOffers = () => {
  return useQuery({
    queryKey: ['seller-offers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('special_offers')
        .select(`
          *,
          products (
            name,
            image_url,
            stock_quantity
          )
        `)
        .eq('created_by', user.id)
        .order('priority_rank', { ascending: true });

      if (error) throw error;
      return data as SpecialOffer[];
    },
  });
};

export const useActiveOffersNearby = (productIds: string[]) => {
  return useQuery({
    queryKey: ['active-offers-nearby', productIds],
    queryFn: async () => {
      if (!productIds.length) return [];

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('special_offers')
        .select(`
          *,
          products (
            name,
            image_url,
            stock_quantity,
            seller_id
          )
        `)
        .in('product_id', productIds)
        .eq('is_active', true)
        .lte('valid_from', now)
        .gte('valid_until', now)
        .order('priority_rank', { ascending: true });

      if (error) throw error;
      return data as SpecialOffer[];
    },
    enabled: productIds.length > 0,
  });
};

export const useCreateOffer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateOfferInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('price, seller_id')
        .eq('id', input.product_id)
        .single();

      if (productError) throw productError;

      // Calculate offer price
      const offerPrice = product.price * (1 - input.discount_percentage / 100);

      // Create offer
      const { data, error } = await supabase
        .from('special_offers')
        .insert({
          product_id: input.product_id,
          offer_title: input.offer_title || `${input.discount_percentage}% Off`,
          offer_description: input.offer_description,
          discount_percentage: input.discount_percentage,
          original_price: product.price,
          offer_price: offerPrice,
          valid_from: input.valid_from,
          valid_until: input.valid_until,
          priority_rank: input.priority_rank,
          max_quantity_per_user: input.max_quantity_per_user,
          total_quantity_available: input.total_quantity_available,
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-offers'] });
      toast({
        title: "Success",
        description: "Special offer created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create offer",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateOffer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SpecialOffer> }) => {
      const { data, error } = await supabase
        .from('special_offers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-offers'] });
      toast({
        title: "Success",
        description: "Offer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update offer",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteOffer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('special_offers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-offers'] });
      toast({
        title: "Success",
        description: "Offer deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete offer",
        variant: "destructive",
      });
    },
  });
};
