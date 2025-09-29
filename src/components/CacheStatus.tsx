import { useQueryClient } from '@tanstack/react-query';
import { backgroundSync } from '@/lib/backgroundSync';
import { CacheManager } from '@/lib/cache';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Database, RefreshCw, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export const CacheStatus = () => {
  const queryClient = useQueryClient();
  const [cacheStats, setCacheStats] = useState({
    queryCache: 0,
    memoryCache: 0,
    pendingOperations: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      const queryCache = queryClient.getQueryCache().getAll().length;
      const memoryCache = CacheManager.getInstance().size();
      const pendingOperations = backgroundSync.getQueuedOperationsCount();

      setCacheStats({
        queryCache,
        memoryCache,
        pendingOperations,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const clearAllCaches = () => {
    // Clear React Query cache
    queryClient.clear();
    
    // Clear memory cache
    CacheManager.getInstance().invalidate();
    
    // Clear background sync queue (be careful with this)
    // backgroundSync.clearAllOperations();
    
    // Clear localStorage (selective)
    try {
      const keysToKeep = ['auth-storage', 'theme'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  };

  const refreshAllData = () => {
    queryClient.invalidateQueries();
  };

  // Don't show in production unless there are pending operations
  if (process.env.NODE_ENV === 'production' && cacheStats.pendingOperations === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="fixed bottom-4 left-4 z-50 shadow-lg bg-background border"
        >
          <Database className="h-4 w-4 mr-2" />
          Cache
          {cacheStats.pendingOperations > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {cacheStats.pendingOperations}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Cache Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Query Cache:</span>
                <span>{cacheStats.queryCache} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory Cache:</span>
                <span>{cacheStats.memoryCache} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Sync:</span>
                <span className={cacheStats.pendingOperations > 0 ? 'text-orange-500' : ''}>
                  {cacheStats.pendingOperations} operations
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshAllData}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All Data
            </Button>
            
            {process.env.NODE_ENV === 'development' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllCaches}
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Caches
              </Button>
            )}
          </div>
          
          {cacheStats.pendingOperations > 0 && (
            <div className="text-xs text-muted-foreground">
              Changes will sync automatically when you're back online.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};