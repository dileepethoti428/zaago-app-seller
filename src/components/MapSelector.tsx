import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// For this demo, we'll use a placeholder token
// In a real app, you'd get this from environment variables or Supabase secrets
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGVzdCIsImEiOiJjazY4ZzJiMTQwNGcwM29xbHV6NTAwam9jIn0.test';

interface MapSelectorProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  onClose: () => void;
  initialLocation?: { latitude: number; longitude: number };
}

export const MapSelector = ({ onLocationSelect, onClose, initialLocation }: MapSelectorProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(
    initialLocation || null
  );
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const { toast } = useToast();

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialLocation ? [initialLocation.longitude, initialLocation.latitude] : [77.5946, 12.9716], // Default to Bangalore
        zoom: 12,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Add click handler
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setSelectedLocation({ latitude: lat, longitude: lng });
        
        // Remove existing marker
        if (marker.current) {
          marker.current.remove();
        }
        
        // Add new marker
        marker.current = new mapboxgl.Marker({ color: '#00e676' })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      });

      // Add initial marker if location provided
      if (initialLocation) {
        marker.current = new mapboxgl.Marker({ color: '#00e676' })
          .setLngLat([initialLocation.longitude, initialLocation.latitude])
          .addTo(map.current);
      }

      setShowTokenInput(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map. Please check your Mapbox token.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      toast({
        title: "No Location Selected",
        description: "Please click on the map to select a location.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real app, you'd reverse geocode to get the address
      const address = `Location: ${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`;
      
      onLocationSelect({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm location. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  if (showTokenInput) {
    return (
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Mapbox Setup Required</h3>
          <p className="text-sm text-zaago-muted-foreground mb-4">
            To use the map feature, please enter your Mapbox public token. You can get one from{' '}
            <a 
              href="https://mapbox.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zaago-green hover:underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
        
        <div>
          <input
            type="text"
            placeholder="Enter your Mapbox public token (pk.xxx...)"
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="w-full p-3 border border-zaago-border rounded-lg bg-zaago-card text-foreground placeholder:text-zaago-muted-foreground"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={initializeMap}
            disabled={!mapboxToken.trim()}
            className="flex-1 bg-zaago-green hover:bg-zaago-green-light text-black"
          >
            Initialize Map
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-zaago-border text-foreground hover:bg-zaago-accent"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        ref={mapContainer} 
        className="w-full h-80 rounded-lg border border-zaago-border" 
      />
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          {selectedLocation ? (
            <p className="text-sm text-zaago-muted-foreground">
              Selected: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
            </p>
          ) : (
            <p className="text-sm text-zaago-muted-foreground">
              Click on the map to select a location
            </p>
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