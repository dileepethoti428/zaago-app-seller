import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProductLocation {
  latitude: number | null;
  longitude: number | null;
}

export const useProductLocation = () => {
  const [location, setLocation] = useState<ProductLocation>({
    latitude: null,
    longitude: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      const errorMsg = 'GPS not supported by your browser';
      setError(errorMsg);
      toast({
        title: "GPS Not Supported",
        description: "Your device doesn't support location detection",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check permission state if available
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ 
            name: 'geolocation' as PermissionName 
          });
          
          if (permission.state === 'denied') {
            throw new Error(
              'Location permission denied. Please enable in browser settings: ' +
              'Settings → Site Settings → Location'
            );
          }
        } catch (permError) {
          // Permission API might not be fully supported, continue anyway
          console.log('Permission check not available, proceeding with detection');
        }
      }

      // Get GPS position with high accuracy
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            let message = 'Failed to detect location';
            if (error.code === error.PERMISSION_DENIED) {
              message = 'Location access denied. Please allow location permissions.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              message = 'GPS unavailable. Please enable GPS on your device.';
            } else if (error.code === error.TIMEOUT) {
              message = 'Location detection timed out. Please try again.';
            }
            reject(new Error(message));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0, // Always get fresh location
          }
        );
      });

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      toast({
        title: "Location Detected",
        description: "GPS coordinates captured successfully",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: "Location Detection Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reDetectLocation = async () => {
    setLocation({ latitude: null, longitude: null });
    await detectLocation();
  };

  return {
    location,
    loading,
    error,
    detectLocation,
    reDetectLocation,
  };
};
