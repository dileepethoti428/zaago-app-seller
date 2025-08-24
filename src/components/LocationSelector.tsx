import { useState } from "react";
import { MapPin, Navigation, Map } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "@/hooks/useLocation";
import { useToast } from "@/hooks/use-toast";

interface LocationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LocationSelector = ({ open, onOpenChange }: LocationSelectorProps) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [manualLocation, setManualLocation] = useState({
    address: "",
    latitude: "",
    longitude: "",
  });
  const { getCurrentLocation, location } = useLocation();
  const { toast } = useToast();

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      await getCurrentLocation();
      toast({
        title: "Location Updated",
        description: "Your location has been automatically detected and updated.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Failed to detect location. Please try again or select manually.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleManualSet = async () => {
    if (!manualLocation.address || !manualLocation.latitude || !manualLocation.longitude) {
      toast({
        title: "Invalid Location",
        description: "Please fill in all location fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here you would typically update the location in your database
      // For now, we'll just show a success message
      toast({
        title: "Location Updated",
        description: "Your location has been manually set.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Update Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/@${location?.latitude || 0},${location?.longitude || 0},15z`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Update Location
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Current Location Display */}
          {location && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-zaago-card-foreground mb-1">Current Location:</p>
              <p className="text-sm text-zaago-muted-foreground">
                {location.address || (location.city && location.state ? `${location.city}, ${location.state}` : 'Unknown location')}
              </p>
              {location.city && location.state && (
                <p className="text-xs text-muted-foreground mt-1">
                  {location.city}, {location.state}
                </p>
              )}
            </div>
          )}

          {/* Auto Detect Option */}
          <div className="space-y-3">
            <h3 className="font-medium text-base">Option 1: Auto Detect</h3>
            <Button 
              onClick={handleAutoDetect} 
              disabled={isDetecting}
              className="w-full"
              size="lg"
            >
              {isDetecting ? (
                <>
                  <Navigation className="mr-2 h-4 w-4 animate-spin" />
                  Detecting Location...
                </>
              ) : (
                <>
                  <Navigation className="mr-2 h-4 w-4" />
                  Detect My Location
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Manual Selection Option */}
          <div className="space-y-4">
            <h3 className="font-medium text-base">Option 2: Select Manually</h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="address" className="text-sm">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter your address"
                  value={manualLocation.address}
                  onChange={(e) => setManualLocation(prev => ({ ...prev, address: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="latitude" className="text-sm">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="31.2682"
                    value={manualLocation.latitude}
                    onChange={(e) => setManualLocation(prev => ({ ...prev, latitude: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-sm">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="75.6942"
                    value={manualLocation.longitude}
                    onChange={(e) => setManualLocation(prev => ({ ...prev, longitude: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleManualSet}
                className="flex-1"
                variant="outline"
              >
                Set Location
              </Button>
              
              <Button 
                onClick={openInMaps}
                variant="outline"
                size="default"
                className="px-3"
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground text-center">
            You can also tap the map icon to open Google Maps and find coordinates
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};