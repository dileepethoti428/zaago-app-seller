import { useState, useEffect } from 'react';

// Network status detection
export const getNetworkStatus = () => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
};

// React hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(getNetworkStatus());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// Network quality detection
export const useNetworkQuality = () => {
  const [quality, setQuality] = useState<'fast' | 'slow' | 'offline'>('fast');

  useEffect(() => {
    const connection = (navigator as any)?.connection;
    
    if (!connection) {
      setQuality('fast');
      return;
    }

    const updateQuality = () => {
      const { effectiveType, downlink } = connection;
      
      if (!navigator.onLine) {
        setQuality('offline');
      } else if (effectiveType === '4g' && downlink > 2) {
        setQuality('fast');
      } else {
        setQuality('slow');
      }
    };

    updateQuality();
    connection.addEventListener('change', updateQuality);

    return () => {
      connection.removeEventListener('change', updateQuality);
    };
  }, []);

  return quality;
};