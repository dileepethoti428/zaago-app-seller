import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/cache';
import { queueLocationUpdate } from '@/lib/backgroundSync';
import { useNetworkStatus } from '@/lib/network';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

const LOCATION_CACHE_KEY = 'user_location';
const LOCATION_QUERY_KEY = 'user-location';
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export const useCachedLocation = () => {
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();

  // Query for user's saved location
  const locationQuery = useQuery({
    queryKey: [LOCATION_QUERY_KEY, user?.id],
    queryFn: async (): Promise<LocationData | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is OK
        throw error;
      }

      return data || null;
    },
    enabled: !!user && isOnline,
    staleTime: ONE_DAY_MS, // 24 hours
    gcTime: ONE_DAY_MS, // Keep for 24 hours
    retry: false,
  });

  // Get cached location from localStorage
  const getCachedLocation = useCallback((): LocationData | null => {
    return storage.getWithExpiry<LocationData>(LOCATION_CACHE_KEY);
  }, []);

  // Get current location with caching
  const getCurrentLocation = useCallback(async (forceRefresh = false): Promise<LocationData | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return null;
    }

    // Return cached location if available and not forcing refresh
    if (!forceRefresh) {
      const cached = getCachedLocation();
      if (cached) {
        return cached;
      }
    }

    setError(null);

    try {
      // Check permissions first
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        throw new Error('Location access denied. Please enable location permissions in your browser settings.');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            let errorMessage = 'Failed to get location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied. Please enable location permissions.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable. Please check your GPS or internet connection.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out. Please try again.';
                break;
            }
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: forceRefresh ? 0 : 60000,
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Use Google Places API for reverse geocoding
      let addressData = {};
      try {
        if (isOnline) {
          const { data, error } = await supabase.functions.invoke('google-places', {
            body: {
              type: 'reverse_geocode',
              lat: latitude,
              lng: longitude,
            },
          });

          if (error) {
            console.warn('Failed to fetch location details:', error);
          } else if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            const addressComponents = result.address_components || [];

            // Extract address components
            const getComponent = (type: string) => {
              const component = addressComponents.find((comp: any) =>
                comp.types.includes(type)
              );
              return component?.long_name || '';
            };

            addressData = {
              address: result.formatted_address || 'Unknown location',
              city: getComponent('locality') || getComponent('administrative_area_level_2'),
              state: getComponent('administrative_area_level_1'),
              pincode: getComponent('postal_code'),
            };
          }
        }
      } catch (addressError) {
        console.warn('Failed to get address from coordinates:', addressError);
      }

      const locationData: LocationData = {
        latitude,
        longitude,
        ...addressData,
      };

      // Cache location locally with 24-hour TTL
      storage.setWithExpiry(LOCATION_CACHE_KEY, locationData, ONE_DAY_MS);

      // Update React Query cache
      queryClient.setQueryData([LOCATION_QUERY_KEY, user?.id], locationData);

      // Save to database if user is logged in and online
      if (user && isOnline) {
        try {
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user.id,
              ...locationData,
            });
        } catch (dbError) {
          console.warn('Failed to save location to database:', dbError);
          // Queue for background sync if failed
          queueLocationUpdate({
            user_id: user.id,
            ...locationData,
          });
        }
      } else if (user && !isOnline) {
        // Queue for background sync when offline
        queueLocationUpdate({
          user_id: user.id,
          ...locationData,
        });
      }

      return locationData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast, queryClient, getCachedLocation, isOnline]);

  // Get the best available location (query data, cache, or fetch new)
  const location = locationQuery.data || getCachedLocation();

  // Auto-fetch location on user login if not available
  useEffect(() => {
    if (user && !location && !locationQuery.isLoading) {
      getCurrentLocation(false);
    }
  }, [user, location, locationQuery.isLoading, getCurrentLocation]);

  return {
    location,
    loading: locationQuery.isLoading,
    error: error || (locationQuery.error ? String(locationQuery.error) : null),
    getCurrentLocation,
    refetch: () => getCurrentLocation(true),
    clearCache: () => {
      storage.remove(LOCATION_CACHE_KEY);
      queryClient.removeQueries({ queryKey: [LOCATION_QUERY_KEY, user?.id] });
    },
  };
};