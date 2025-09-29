import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from './useLocation';
import { createLocationCacheKey } from '@/lib/cache';
import { useNetworkStatus } from '@/lib/network';

interface ProductWithDistance {
  product_id: string;
  product_name: string;
  product_description: string;
  product_price: number;
  discounted_price: number;
  discount_percentage: number;
  original_price: number;
  product_image_url: string;
  stock_quantity: number;
  seller_id: string;
  seller_location: any;
  distance_km: number;
}

export const useCachedProducts = (maxDistance: number = 15) => {
  const { user } = useAuth();
  const { location } = useLocation();
  const isOnline = useNetworkStatus();

  const queryKey = location 
    ? createLocationCacheKey('products', location.latitude, location.longitude, maxDistance)
    : ['products', 'no-location'];

  return useQuery({
    queryKey: [queryKey],
    queryFn: async (): Promise<ProductWithDistance[]> => {
      if (!location || !user) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_products_within_range', {
        customer_lat: location.latitude,
        customer_lon: location.longitude,
        range_km: maxDistance,
      });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        seller_location: item.seller_location || {
          latitude: 0,
          longitude: 0,
          address: '',
          city: ''
        }
      }));
    },
    enabled: !!location && !!user && isOnline,
    staleTime: 2 * 60 * 1000, // 2 minutes for location-based data
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });
};

// Hook for product details with caching
export const useCachedProduct = (productId: string) => {
  const isOnline = useNetworkStatus();

  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            description
          )
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!productId && isOnline,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: (failureCount, error: any) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });
};

// Hook for seller's products with caching
export const useCachedSellerProducts = (sellerId?: string) => {
  const isOnline = useNetworkStatus();

  return useQuery({
    queryKey: ['seller-products', sellerId],
    queryFn: async () => {
      if (!sellerId) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sellerId && isOnline,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // Keep in cache for 8 minutes
  });
};