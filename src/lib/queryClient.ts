import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Create persister for localStorage
export const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'REACT_QUERY_CACHE',
  throttleTime: 1000,
});

// Enhanced query client with optimized caching and persistence
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Extended cache times for better performance
      staleTime: 10 * 60 * 1000, // 10 minutes
      // Keep in cache for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for network errors
        return failureCount < 3;
      },
      // Background refetch settings
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: false, // Prevent refetch on component mount
      // Network-aware refetching
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations on network errors
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      networkMode: 'online',
    },
  },
});

// Query client persistence will be handled by React Query's built-in persistence
// We'll add localStorage persistence separately for critical data

// Network-aware query invalidation
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    queryClient.invalidateQueries();
  });
}
