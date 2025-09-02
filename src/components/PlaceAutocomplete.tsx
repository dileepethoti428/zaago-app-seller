import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: {
    address: string;
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
    country?: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export const PlaceAutocomplete: React.FC<PlaceAutocompleteProps> = ({
  onPlaceSelect,
  placeholder = "Search for a place...",
  className,
}) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const searchPlaces = async () => {
      if (query.length < 3) {
        setPredictions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: {
            type: 'place_autocomplete',
            input: query,
          },
        });

        if (error) {
          console.error('Places search error:', error);
          return;
        }

        if (data.status === 'OK' && data.predictions) {
          setPredictions(data.predictions);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } else {
          setPredictions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Places search error:', error);
        setPredictions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchPlaces, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handlePlaceSelect = async (placeId: string, description: string) => {
    setIsLoading(true);
    setShowSuggestions(false);
    setQuery(description);

    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: {
          type: 'place_details',
          place_id: placeId,
        },
      });

      if (error) {
        console.error('Place details error:', error);
        return;
      }

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const location = result.geometry?.location;
        const addressComponents = result.address_components || [];

        if (location) {
          // Extract address components
          const getComponent = (type: string) => {
            const component = addressComponents.find((comp: any) => 
              comp.types.includes(type)
            );
            return component?.long_name || '';
          };

          onPlaceSelect({
            address: result.formatted_address || description,
            latitude: location.lat,
            longitude: location.lng,
            city: getComponent('locality') || getComponent('administrative_area_level_2'),
            state: getComponent('administrative_area_level_1'),
            country: getComponent('country'),
          });
        }
      }
    } catch (error) {
      console.error('Place details error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          const selected = predictions[selectedIndex];
          handlePlaceSelect(selected.place_id, selected.description);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setShowSuggestions(true);
          }}
          className="pl-10"
          disabled={isLoading}
        />
      </div>

      {showSuggestions && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((prediction, index) => (
            <Button
              key={prediction.place_id}
              ref={(el) => (suggestionRefs.current[index] = el)}
              variant="ghost"
              className={cn(
                "w-full justify-start px-3 py-2 h-auto text-left rounded-none border-0",
                selectedIndex === index && "bg-accent"
              )}
              onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
            >
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {prediction.structured_formatting.main_text}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {prediction.structured_formatting.secondary_text}
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* Backdrop to close suggestions */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
};