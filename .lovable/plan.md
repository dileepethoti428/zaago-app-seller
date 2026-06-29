# Replace Mapbox with Google Maps in "Select on Map"

`MapSelector.tsx` currently uses Mapbox GL, which fails because no Mapbox token is configured. Replace it with the Google Maps JavaScript API (already working for "Select Automatically" via the Google Maps connector).

## Changes

**File:** `src/components/MapSelector.tsx` — rewrite to use Google Maps JS API.

1. Remove `mapbox-gl` imports, `useMapboxToken` hook usage, and Mapbox-specific refs/types.
2. Load the Google Maps JS API once via a small script-loader (idempotent):
   - URL: `https://maps.googleapis.com/maps/api/js?key=${VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY}&loading=async&libraries=marker&callback=__zaagoInitGmaps&channel=${VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID}`
   - Use a global callback + a module-level promise so multiple mounts share one load.
   - If the env key is missing, surface the existing "Map Unavailable" error UI with a clearer message.
3. Initialize `google.maps.Map` in the container div (no `mapId`), center on `initialLocation` or default `[31.2509, 75.7006]`, zoom 12.
4. Use `google.maps.Marker` (per connector guidance, NOT `AdvancedMarkerElement`) with `#00e676` color via a simple SVG icon or default marker, draggable.
5. On map `click`, set/move the marker and update `selectedLocation` with `lat`/`lng` from `e.latLng`.
6. Keep `handleConfirmLocation` exactly as-is — it already uses the existing `google-places` edge function for reverse geocoding.
7. Keep the same outer JSX (container div, footer with selected coords + Cancel/Confirm buttons), loading skeleton, and error fallback so the rest of the app is unaffected.
8. Cleanup on unmount: remove marker, clear listeners, drop map ref.

## Notes

- Pure frontend swap inside `MapSelector.tsx`. No other files, hooks, or edge functions touched.
- `useMapboxToken` hook remains in the codebase (harmless) and can be removed later if no other consumer uses it.
- The browser key `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` is already used elsewhere for the same connector.
