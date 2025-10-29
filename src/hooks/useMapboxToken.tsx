import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storage } from '@/lib/cache';

const MAPBOX_TOKEN_CACHE_KEY = 'mapbox_token';
const MAPBOX_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedToken {
  token: string;
  timestamp: number;
}

export const useMapboxToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Check cache first
        const cached = storage.get<CachedToken>(MAPBOX_TOKEN_CACHE_KEY);
        if (cached && Date.now() - cached.timestamp < MAPBOX_TOKEN_TTL) {
          setToken(cached.token);
          setLoading(false);
          return;
        }

        // Fetch from edge function
        const { data, error: fetchError } = await supabase.functions.invoke('get-mapbox-token');
        
        if (fetchError) throw fetchError;
        if (!data?.token) throw new Error('No token received');

        // Cache the token
        storage.set(MAPBOX_TOKEN_CACHE_KEY, {
          token: data.token,
          timestamp: Date.now(),
        });

        setToken(data.token);
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch token');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  return { token, loading, error };
};
