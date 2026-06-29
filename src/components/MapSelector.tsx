import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MapSelectorProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  onClose: () => void;
  initialLocation?: { latitude: number; longitude: number };
}

declare global {
  interface Window {
    google?: any;
    __zaagoInitGmaps?: () => void;
  }
}

let gmapsLoaderPromise: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps) return Promise.resolve();
  if (gmapsLoaderPromise) return gmapsLoaderPromise;

  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!browserKey) {
    return Promise.reject(new Error('Google Maps browser key is not configured.'));
  }

  gmapsLoaderPromise = new Promise<void>((resolve, reject) => {
    window.__zaagoInitGmaps = () => resolve();
    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: browserKey,
      loading: 'async',
      callback: '__zaagoInitGmaps',
    });
    if (channel) params.set('channel', channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      gmapsLoaderPromise = null;
      reject(new Error('Failed to load Google Maps script.'));
    };
    document.head.appendChild(script);
  });

  return gmapsLoaderPromise;
};

export const MapSelector = ({ onLocationSelect, onClose, initialLocation }: MapSelectorProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(
    initialLocation || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapContainer.current || !window.google?.maps) return;

        const center = initialLocation
          ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
          : { lat: 31.2509, lng: 75.7006 };

        const map = new window.google.maps.Map(mapContainer.current, {
          center,
          zoom: 13,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const placeMarker = (lat: number, lng: number) => {
          if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng });
          } else {
            markerRef.current = new window.google.maps.Marker({
              position: { lat, lng },
              map,
              draggable: true,
            });
            markerRef.current.addListener('dragend', (e: any) => {
              const pos = e.latLng;
              if (!pos) return;
              setSelectedLocation({ latitude: pos.lat(), longitude: pos.lng() });
            });
          }
        };

        if (initialLocation) {
          placeMarker(initialLocation.latitude, initialLocation.longitude);
        }

        map.addListener('click', (e: any) => {
          const pos = e.latLng;
          if (!pos) return;
          const lat = pos.lat();
          const lng = pos.lng();
          setSelectedLocation({ latitude: lat, longitude: lng });
          placeMarker(lat, lng);
        });

        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Google Maps load error:', err);
        setError(err?.message || 'Failed to load map. Please check your internet connection.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      toast({
        title: 'No Location Selected',
        description: 'Please click on the map to select a location.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: addressData } = await supabase.functions.invoke('google-places', {
        body: {
          type: 'reverse_geocode',
          lat: selectedLocation.latitude,
          lng: selectedLocation.longitude,
        },
      });

      const address =
        addressData?.result?.address ||
        `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`;

      onLocationSelect({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address,
      });
    } catch (err) {
      console.error('Error getting address:', err);
      onLocationSelect({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`,
      });
    }
  };

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Map Unavailable</h3>
          <p className="text-sm text-zaago-muted-foreground mb-4">{error}</p>
        </div>
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full border-zaago-border text-foreground hover:bg-zaago-accent"
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          ref={mapContainer}
          className="w-full h-[450px] rounded-lg border border-zaago-border bg-zaago-card/50"
          style={{ minHeight: '450px', width: '100%', position: 'relative' }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zaago-card/70 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green mx-auto mb-2"></div>
              <p className="text-sm text-zaago-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          {selectedLocation ? (
            <p className="text-sm text-zaago-muted-foreground">
              Selected: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
            </p>
          ) : (
            <p className="text-sm text-zaago-muted-foreground">Click on the map to select a location</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-zaago-border text-foreground hover:bg-zaago-accent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmLocation}
            disabled={!selectedLocation}
            className="bg-zaago-green hover:bg-zaago-green-light text-black"
          >
            Confirm Location
          </Button>
        </div>
      </div>
    </div>
  );
};
