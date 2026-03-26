

## Root Cause

There are **two separate location hooks**, and the wrong one has no caching:

1. **`useCachedLocation.tsx`** (used by `Topbar.tsx`) — Has localStorage caching with 30-day TTL. Checks cache before calling APIs. Works correctly.

2. **`useLocation.tsx`** (used by `LocationSelector.tsx`, `ProductSuggestionForm.tsx`, `useProductsNearby.tsx`) — Has **ZERO caching**. Location is stored only in React state (`useState`). Every time the app reopens, state resets to `null`, triggering a fresh GPS request + Google Places API call.

The `useLocation` hook at line 156 does: `if (user && !location) → getCurrentLocation(false)`. Since `location` is always `null` on app restart (React state resets), it calls the Google Places reverse geocode API every single time.

## Fix

Replace `useLocation.tsx` with a wrapper around `useCachedLocation` so all consumers share the same 30-day localStorage cache. This way, no matter which hook is used anywhere in the app, the cached location is checked first and the Google Places API is only called when the cache is empty or expired.

### Changes to `src/hooks/useLocation.tsx`
- Remove the entire standalone implementation (GPS fetch, Google Places call, DB save — all duplicated from `useCachedLocation`)
- Replace with a thin wrapper that re-exports `useCachedLocation` with the same interface (`location`, `loading`, `error`, `getCurrentLocation`, `startLocationUpdates`)
- This ensures `LocationSelector`, `ProductSuggestionForm`, and `useProductsNearby` all use the cached version

### Result
- On app reopen: localStorage cache is checked first (30-day TTL)
- If cached location exists → no GPS, no Google Places API call, no Supabase edge function invocation
- API only called when cache is expired or user forces refresh

## Files Changed
- `src/hooks/useLocation.tsx` — replace with wrapper around `useCachedLocation`

