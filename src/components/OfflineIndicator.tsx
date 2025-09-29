import { useNetworkStatus, useNetworkQuality } from '@/lib/network';
import { backgroundSync } from '@/lib/backgroundSync';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

export const OfflineIndicator = () => {
  const isOnline = useNetworkStatus();
  const networkQuality = useNetworkQuality();
  const [queuedOperations, setQueuedOperations] = useState(0);

  useEffect(() => {
    const updateOperationsCount = () => {
      setQueuedOperations(backgroundSync.getQueuedOperationsCount());
    };

    // Update immediately
    updateOperationsCount();

    // Update every 5 seconds
    const interval = setInterval(updateOperationsCount, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isOnline && networkQuality === 'fast' && queuedOperations === 0) {
    return null;
  }

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: 'Offline',
        variant: 'destructive' as const,
        description: 'Working offline - changes will sync when online'
      };
    }

    if (networkQuality === 'slow') {
      return {
        icon: Wifi,
        text: 'Slow Connection',
        variant: 'secondary' as const,
        description: 'Slower network detected'
      };
    }

    if (queuedOperations > 0) {
      return {
        icon: Clock,
        text: `Syncing ${queuedOperations} item${queuedOperations > 1 ? 's' : ''}`,
        variant: 'secondary' as const,
        description: 'Background sync in progress'
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  const Icon = statusInfo.icon;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge 
        variant={statusInfo.variant}
        className="flex items-center gap-2 px-3 py-2 shadow-lg"
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{statusInfo.text}</span>
      </Badge>
    </div>
  );
};