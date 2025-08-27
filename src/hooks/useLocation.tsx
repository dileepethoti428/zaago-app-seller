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
            maximumAge: 600000, // 10 minutes cache
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocoding to get address with timeout
      let addressData = {};
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for API call
        
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          addressData = {
            address: data.locality || data.city || 'Unknown location',
            city: data.city || data.locality,
            state: data.principalSubdivision,
            pincode: data.postcode,
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
    getCurrentLocation();
    
    // Update location every 5 minutes instead of 10 seconds (less aggressive)
    const interval = setInterval(getCurrentLocation, 300000);
    
    return () => clearInterval(interval);
  }, [getCurrentLocation]);

  useEffect(() => {
    // Only auto-start location updates in critical scenarios
    // For better UX, let components manually trigger location requests
  }, [user, startLocationUpdates]);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    startLocationUpdates,
  };
};