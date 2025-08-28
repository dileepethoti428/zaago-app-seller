import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface SellerLocationSetupProps {
  onLocationSaved?: () => void;
}

export const SellerLocationSetup = ({ onLocationSaved }: SellerLocationSetupProps) => {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const { toast } = useToast();
  const { user } = useAuth();

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;
      await saveLocation(latitude, longitude, address || 'Current Location');
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Failed to get your current location. Please enter coordinates manually.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveLocation = async (lat: number, lng: number, addressText: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('sellers')
        .update({
          latitude: lat,
          longitude: lng,
          address: { address: addressText },
          location_verified: true,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Location Saved",
        description: "Your seller location has been saved successfully!",
      });
      
      onLocationSaved?.();
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualSave = async () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);

    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Invalid Coordinates",
        description: "Please enter valid latitude and longitude values",
        variant: "destructive",
      });
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Invalid Coordinates",
        description: "Latitude must be between -90 and 90, longitude between -180 and 180",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    await saveLocation(lat, lng, address || `${lat}, ${lng}`);
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Set Your Store Location
        </CardTitle>
        <CardDescription>
          Add your store location so customers within 15km can find your products
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Store Address (Optional)</Label>
          <Input
            id="address"
            placeholder="Enter your store address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <Button 
          onClick={getCurrentLocation} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Location...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Use Current Location
            </>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              placeholder="e.g. 28.6139"
              value={manualCoords.lat}
              onChange={(e) => setManualCoords(prev => ({ ...prev, lat: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lng">Longitude</Label>
            <Input
              id="lng"
              placeholder="e.g. 77.2090"
              value={manualCoords.lng}
              onChange={(e) => setManualCoords(prev => ({ ...prev, lng: e.target.value }))}
            />
          </div>
        </div>

        <Button 
          onClick={handleManualSave} 
          disabled={loading || !manualCoords.lat || !manualCoords.lng}
          variant="outline"
          className="w-full"
        >
          Save Manual Location
        </Button>
      </CardContent>
    </Card>
  );
};