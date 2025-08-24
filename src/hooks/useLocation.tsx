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

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding to get address
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      let addressData = {};
      if (response.ok) {
        const data = await response.json();
        addressData = {
          address: data.locality || data.city || 'Unknown location',
          city: data.city || data.locality,
          state: data.principalSubdivision,
          pincode: data.postcode,
        };
      }

      const locationData: LocationData = {
        latitude,
        longitude,
        ...addressData,
      };

      setLocation(locationData);

      // Save to database if user is logged in
      if (user) {
        await supabase
          .from('user_locations')
          .upsert({
            user_id: user.id,
            ...locationData,
          });
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
    getCurrentLocation();
    
    // Update location every 10 seconds
    const interval = setInterval(getCurrentLocation, 10000);
    
    return () => clearInterval(interval);
  }, [getCurrentLocation]);

  useEffect(() => {
    if (user) {
      const cleanup = startLocationUpdates();
      return cleanup;
    }
  }, [user, startLocationUpdates]);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    startLocationUpdates,
  };
};