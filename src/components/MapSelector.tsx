import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch Mapbox token from Supabase secrets
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        setLoading(true);
        console.log('Fetching Mapbox token...');
        
        const { data, error } = await supabase.functions.invoke('get-mapbox-token', {
          method: 'POST'
        });
        
        console.log('Response:', { data, error });
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          setError('Failed to load map. Please check your Mapbox token configuration.');
          return;
        }
        
        if (data?.token) {
          console.log('Token received, initializing map...');
          setMapboxToken(data.token);
          initializeMap(data.token);
        } else {
          console.error('No token in response:', data);
          setError('Mapbox token not configured. Please contact your administrator.');
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        setError('Failed to load map configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchMapboxToken();
  }, []);

  const initializeMap = (token: string) => {
    if (!mapContainer.current || !token) return;

    try {
      mapboxgl.accessToken = token;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialLocation ? [initialLocation.longitude, initialLocation.latitude] : [75.7006, 31.2509], // Default to Phagwara, Punjab
        zoom: 12,
        attributionControl: false,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Wait for map to load before adding interactions
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        
        // Add click handler
        map.current!.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          console.log('Map clicked:', { lat, lng });
          setSelectedLocation({ latitude: lat, longitude: lng });
          
          // Remove existing marker
          if (marker.current) {
            marker.current.remove();
          }
          
          // Add new marker
          marker.current = new mapboxgl.Marker({ 
            color: '#00e676',
            scale: 1.2
          })
            .setLngLat([lng, lat])
            .addTo(map.current!);
        });

        // Add initial marker if location provided
        if (initialLocation) {
          marker.current = new mapboxgl.Marker({ 
            color: '#00e676',
            scale: 1.2
          })
            .setLngLat([initialLocation.longitude, initialLocation.latitude])
            .addTo(map.current!);
        }
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Failed to load map. Please check your internet connection.');
      });

      setError(null);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map. Please check your Mapbox token.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-zaago-card/50 rounded-lg border border-zaago-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green mx-auto mb-2"></div>
          <p className="text-sm text-zaago-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

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
      <div 
        ref={mapContainer} 
        className="w-full h-80 rounded-lg border border-zaago-border bg-gray-100"
        style={{ 
          minHeight: '320px',
          position: 'relative'
        }}
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