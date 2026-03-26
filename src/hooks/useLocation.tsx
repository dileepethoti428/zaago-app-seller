import { useCachedLocation } from './useCachedLocation';
import { useCallback } from 'react';

export const useLocation = () => {
  const { location, loading, error, getCurrentLocation, refetch, clearCache } = useCachedLocation();

  const startLocationUpdates = useCallback(() => {
    refetch();
    return () => {};
  }, [refetch]);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    startLocationUpdates,
  };
};
