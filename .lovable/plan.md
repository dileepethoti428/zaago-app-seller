
# Reduce Location API Calls with 1-Day Caching

## Problem
Every time the app opens, the `useLocation` hook in the Topbar fetches GPS coordinates and calls the Google Places API for reverse geocoding. This happens repeatedly on every page navigation because the Topbar is always mounted via the Layout. There is no persistent caching, so the same location data is fetched fresh each time.

## Solution
Consolidate all location usage to use `useCachedLocation` with a 1-day localStorage cache, and stop using the uncached `useLocation` hook.

### Changes

**1. `src/lib/cache.ts` - Add expiry-aware localStorage caching**
- Update the `storage.set` method to store a timestamp alongside the data
- Add a `storage.getWithExpiry` method that checks if data has expired
- Default expiry: 24 hours (86,400,000 ms)

**2. `src/hooks/useCachedLocation.tsx` - Use 1-day cache TTL**
- Change `LOCATION_CACHE_KEY` storage to use the expiry-aware method
- Set cache TTL to 24 hours
- Increase `staleTime` from 10 minutes to 24 hours so React Query doesn't refetch the database query constantly
- Increase `gcTime` accordingly
- Only call GPS + Google Places if no valid cached data exists within 24 hours

**3. `src/components/Topbar.tsx` - Switch to `useCachedLocation`**
- Replace `import { useLocation }` with `import { useCachedLocation }`
- Replace `useLocation()` call with `useCachedLocation()`
- This is the main place causing repeated API calls on every app open

**4. `src/hooks/useCachedProducts.tsx` - Switch to `useCachedLocation`**
- Replace `useLocation` import and usage with `useCachedLocation`

**5. `src/hooks/useProductsWithLocation.tsx` - Switch to `useCachedLocation`**
- Replace `useLocation` import and usage with `useCachedLocation`

### How the caching works after changes

1. User opens app -> check localStorage for location with timestamp
2. If location exists and is less than 24 hours old -> use it immediately, no API calls
3. If location is missing or older than 24 hours -> fetch GPS, call Google Places, save to localStorage with new timestamp
4. Manual refresh button in Topbar still works (calls `getCurrentLocation(true)` to force refresh)

### Files to modify
- `src/lib/cache.ts` (add expiry-aware storage)
- `src/hooks/useCachedLocation.tsx` (24-hour TTL)
- `src/components/Topbar.tsx` (switch hook)
- `src/hooks/useCachedProducts.tsx` (switch hook)
- `src/hooks/useProductsWithLocation.tsx` (switch hook)
