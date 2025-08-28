import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

const SellerLocation = () => {
  const [location, setLocation] = useState({
    latitude: '',
    longitude: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSellerLocation = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('sellers')
          .select('latitude, longitude, address')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setLocation({
            latitude: data.latitude?.toString() || '',
            longitude: data.longitude?.toString() || '',
            address: typeof data.address === 'string' ? data.address : JSON.stringify(data.address) || ''
          });
        }
      } catch (error) {
        console.error('Error fetching seller location:', error);
      }
    };

    fetchSellerLocation();
  }, [user]);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    setFetchingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 600000
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding to get address
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        
        if (response.ok) {
          const data = await response.json();
          const address = data.locality || data.city || 'Unknown location';
          
          setLocation({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            address
          });

          toast({
            title: "Location detected",
            description: `Location set to: ${address}`,
          });
        }
      } catch (addressError) {
        console.warn('Failed to get address:', addressError);
        setLocation({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          address: ''
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location Error",
        description: "Failed to get your current location. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!user || !location.latitude || !location.longitude) {
      toast({
        title: "Error",
        description: "Please provide both latitude and longitude",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('sellers')
        .update({
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          address: location.address,
          location_verified: true
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your location has been saved successfully!",
      });
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Seller Location
            </CardTitle>
            <CardDescription>
              Set your business location to show your products to nearby customers within 15km radius
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Your current location helps customers find products near them
              </p>
              <Button
                variant="outline"
                onClick={getCurrentLocation}
                disabled={fetchingLocation}
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                {fetchingLocation ? 'Getting Location...' : 'Use Current Location'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 28.6139"
                  value={location.latitude}
                  onChange={(e) => setLocation({ ...location, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 77.2090"
                  value={location.longitude}
                  onChange={(e) => setLocation({ ...location, longitude: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                placeholder="e.g., New Delhi, India"
                value={location.address}
                onChange={(e) => setLocation({ ...location, address: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg dark:bg-blue-900/20">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Your products will only be visible to customers within 15km</li>
                <li>• Customers see products sorted by distance from their location</li>
                <li>• This helps create a local marketplace experience</li>
              </ul>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading || !location.latitude || !location.longitude}
              className="w-full"
            >
              {loading ? 'Saving...' : 'Save Location'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SellerLocation;