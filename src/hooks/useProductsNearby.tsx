import { useCachedProducts } from './useCachedProducts';
import { useLocation } from './useLocation';

export const useProductsNearby = (maxDistance: number = 15) => {
  const { location } = useLocation();
  const query = useCachedProducts(maxDistance);

  return {
    products: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    customerLocation: location,
  };
};
