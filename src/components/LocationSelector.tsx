import { useState } from "react";
import { MapPin, Navigation, Map, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/useLocation";
import { useToast } from "@/hooks/use-toast";
import { MapSelector } from "./MapSelector";
import { PlaceAutocomplete } from "./PlaceAutocomplete";

interface LocationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LocationSelector = ({ open, onOpenChange }: LocationSelectorProps) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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

  const handleMapLocationSelect = (selectedLocation: { latitude: number; longitude: number; address: string }) => {
    toast({
      title: "Location Updated",
      description: "Your location has been selected from the map.",
    });
    setShowMap(false);
    onOpenChange(false);
  };

  const handlePlaceSelect = (place: any) => {
    toast({
      title: "Location Updated",
      description: `Location set to ${place.address}`,
    });
    setShowSearch(false);
    onOpenChange(false);
  };

  if (showMap) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl bg-zaago-card border-zaago-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
              <Map className="h-5 w-5 text-zaago-green" />
              Select Location on Map
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <MapSelector
              onLocationSelect={handleMapLocationSelect}
              onClose={() => setShowMap(false)}
              initialLocation={location ? { latitude: location.latitude!, longitude: location.longitude! } : undefined}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showSearch) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-zaago-card border-zaago-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
              <Search className="h-5 w-5 text-zaago-green" />
              Search for Location
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <PlaceAutocomplete
              onPlaceSelect={handlePlaceSelect}
              placeholder="Type an address or place name..."
              className="w-full"
            />
            
            <Button 
              variant="outline" 
              onClick={() => setShowSearch(false)}
              className="w-full border-zaago-border text-foreground hover:bg-zaago-accent"
            >
              Back to Options
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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

          {/* Three Main Options */}
          <div className="grid grid-cols-1 gap-3">
            {/* Option 1: Select Automatically */}
            <Button 
              onClick={handleAutoDetect} 
              disabled={isDetecting}
              className="h-14 bg-zaago-green hover:bg-zaago-green-light text-black font-medium flex flex-col items-center justify-center gap-1"
              size="lg"
            >
              {isDetecting ? (
                <>
                  <Navigation className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Detecting...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  <span className="text-sm">Detect Automatically</span>
                </>
              )}
            </Button>

            {/* Option 2: Search Places */}
            <Button 
              onClick={() => setShowSearch(true)}
              variant="outline"
              className="h-14 border-zaago-border text-foreground hover:bg-zaago-accent flex flex-col items-center justify-center gap-1"
              size="lg"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Search Places</span>
            </Button>

            {/* Option 3: Select on Map */}
            <Button 
              onClick={() => setShowMap(true)}
              variant="outline"
              className="h-14 border-zaago-border text-foreground hover:bg-zaago-accent flex flex-col items-center justify-center gap-1"
              size="lg"
            >
              <Map className="h-4 w-4" />
              <span className="text-sm">Select on Map</span>
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