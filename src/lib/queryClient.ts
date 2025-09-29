import { QueryClient } from '@tanstack/react-query';

// Enhanced query client with optimized caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
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
