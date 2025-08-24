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
      <DialogContent className="sm:max-w-md bg-zaago-card border-zaago-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <MapPin className="h-5 w-5 text-zaago-green" />
            Select Location
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Current Location Display */}
          {location && (
            <div className="p-3 bg-zaago-accent/20 rounded-lg border border-zaago-border">
              <p className="text-sm font-medium text-foreground mb-1">Current Location:</p>
              <p className="text-sm text-zaago-muted-foreground">
                {location.address || (location.city && location.state ? `${location.city}, ${location.state}` : 'Unknown location')}
              </p>
            </div>
          )}

          {/* Two Main Options */}
          <div className="grid grid-cols-1 gap-4">
            {/* Option 1: Select Automatically */}
            <Button 
              onClick={handleAutoDetect} 
              disabled={isDetecting}
              className="h-16 bg-zaago-green hover:bg-zaago-green-light text-black font-medium flex flex-col items-center justify-center gap-2"
              size="lg"
            >
              {isDetecting ? (
                <>
                  <Navigation className="h-5 w-5 animate-spin" />
                  <span>Detecting Location...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-5 w-5" />
                  <span>Select Automatically</span>
                </>
              )}
            </Button>

            {/* Option 2: Select on Map */}
            <Button 
              onClick={() => {
                // For now, open Google Maps to allow manual selection
                window.open('https://www.google.com/maps', '_blank');
              }}
              variant="outline"
              className="h-16 border-zaago-border text-foreground hover:bg-zaago-accent flex flex-col items-center justify-center gap-2"
              size="lg"
            >
              <Map className="h-5 w-5" />
              <span>Select on Map</span>
            </Button>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-zaago-muted-foreground text-center">
            Choose automatic detection for quick setup, or use the map for precise location selection
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};