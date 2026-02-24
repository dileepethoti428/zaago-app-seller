import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCachedLocation } from './useCachedLocation';
import { useAuth } from '@/context/AuthContext';

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

export const useProductsWithLocation = (maxDistance: number = 15) => {
  const [products, setProducts] = useState<ProductWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location } = useCachedLocation();
  const { user } = useAuth();

  useEffect(() => {
    const fetchProductsInRange = async () => {
      if (!location || !user) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('get_products_within_range', {
          customer_lat: location.latitude,
          customer_lon: location.longitude,
          range_km: maxDistance,
        });

        if (error) throw error;

        setProducts((data || []).map((item: any) => ({
          ...item,
          seller_location: item.seller_location || {
            latitude: 0,
            longitude: 0,
            address: '',
            city: ''
          }
        })));
      } catch (err) {
        console.error('Error fetching products in range:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProductsInRange();
  }, [location, user, maxDistance]);

  return {
    products,
    loading,
    error,
    customerLocation: location,
  };
};