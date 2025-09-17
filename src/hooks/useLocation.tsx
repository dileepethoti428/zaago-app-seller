import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const getCurrentLocation = useCallback(async (forceRefresh = false) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
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
            timeout: 30000, // Increased to 30 seconds
            maximumAge: forceRefresh ? 0 : 300000, // Force fresh location if requested, otherwise 5 minute cache
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Use Google Places API for reverse geocoding
      let addressData = {};
      try {
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: {
            type: 'reverse_geocode',
            lat: latitude,
            lng: longitude,
          },
        });

        if (error) {
          throw new Error(`Failed to fetch location details: ${error.message}`);
        }

        if (data.status === 'OK' && data.results && data.results.length > 0) {
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
      } catch (addressError) {
        console.warn('Failed to get address from coordinates:', addressError);
        // Continue without address data
      }

      const locationData: LocationData = {
        latitude,
        longitude,
        ...addressData,
      };

      setLocation(locationData);

      // Save to database if user is logged in
      if (user) {
        try {
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user.id,
              ...locationData,
            });
        } catch (dbError) {
          console.warn('Failed to save location to database:', dbError);
          // Don't show error to user as location was still obtained
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const startLocationUpdates = useCallback(() => {
    getCurrentLocation(true); // Force refresh on manual request only
    
    // Removed auto-refresh interval - location will only update on manual request
    return () => {}; // No cleanup needed
  }, [getCurrentLocation]);

  useEffect(() => {
    // Auto-start location detection when user is available
    if (user) {
      getCurrentLocation(false); // Use cache for initial load
    }
  }, [user, getCurrentLocation]);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    startLocationUpdates,
  };
};