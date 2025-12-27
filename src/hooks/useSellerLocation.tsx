import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SellerLocationData {
  latitude: number | null;
  longitude: number | null;
  address: any;
  location_verified: boolean;
}

export const useSellerLocation = () => {
  const [sellerLocation, setSellerLocation] = useState<SellerLocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch seller's current location from database
  const fetchSellerLocation = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('latitude, longitude, address, location_verified')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching seller location:', error);
        setError('Failed to fetch location data');
        return;
      }

      setSellerLocation(data);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update seller location with current coordinates
  const updateSellerLocation = async (latitude: number, longitude: number, address?: any) => {
    if (!user) return false;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('update_seller_location_from_current', {
        seller_user_id: user.id,
        current_lat: latitude,
        current_lng: longitude,
        current_address: address || null
      });

      if (error) {
        console.error('Error updating seller location:', error);
        setError('Failed to update location');
        toast({
          title: "Location Update Failed",
          description: "Failed to update your business location. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Refresh the location data
      await fetchSellerLocation();
      
      toast({
        title: "Location Updated",
        description: "Your business location has been updated successfully.",
      });
      
      return true;
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating location.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get current location from browser and update seller location
  const updateLocationFromCurrent = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    setError(null);

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Get address from coordinates using the Google Places edge function
            const { data: addressData } = await supabase.functions.invoke('google-places', {
              body: { 
                type: 'reverse_geocode',
                lat: latitude,
                lng: longitude
              }
            });

            const address = addressData?.result || {
              latitude,
              longitude,
              address: `${latitude}, ${longitude}`,
              city: '',
              state: ''
            };

            const success = await updateSellerLocation(latitude, longitude, address);
            resolve(success);
          } catch (err) {
            console.error('Error getting address:', err);
            // Update location with coordinates only if address lookup fails
            const success = await updateSellerLocation(latitude, longitude);
            resolve(success);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Failed to get your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          setError(errorMessage);
          toast({
            title: "Location Error",
            description: errorMessage,
            variant: "destructive",
          });
          setLoading(false);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  // Check if location is locked (seller has products)
  const checkIfLocationLocked = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id);

      if (error) {
        console.error('Error checking products:', error);
        return false;
      }

      // If seller has any products, location is locked
      return (count ?? 0) > 0;
    } catch (err) {
      console.error('Error checking location lock:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchSellerLocation();
  }, [user]);

  return {
    sellerLocation,
    loading,
    error,
    fetchSellerLocation,
    updateSellerLocation,
    updateLocationFromCurrent,
    checkIfLocationLocked,
  };
};