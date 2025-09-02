import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  variant_value: string;
  price: number;
  stock_quantity: number;
  is_default: boolean;
  is_active: boolean;
}

export const useProductVariants = (productId?: string) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchVariants();
    }
  }, [productId]);

  const fetchVariants = async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('variant_name');

      if (error) throw error;

      setVariants(data || []);
    } catch (err) {
      console.error('Error fetching product variants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch variants');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultVariant = () => {
    return variants.find(variant => variant.is_default) || variants[0] || null;
  };

  const getVariantPrice = (basePrice: number, variant?: ProductVariant) => {
    if (!variant) return basePrice;
    return variant.price; // Use the variant's actual price instead of adjustment
  };

  return {
    variants,
    loading,
    error,
    refetch: fetchVariants,
    getDefaultVariant,
    getVariantPrice,
  };
};