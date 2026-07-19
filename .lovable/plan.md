## Fix Directions button in Subscriptions page

**Two issues to fix in `src/pages/Subscriptions.tsx`:**

### 1. Wrong destination (opens text address, not exact coordinates)
The customer's coordinates in `delivery_address` are nested under a `coordinates` object (either `coordinates.lat/lng` or `coordinates.latitude/longitude`), but the current `openDirections` reads `addr.latitude / addr.lat` at the top level. Those keys don't exist, so it always falls back to the free-text `full_address` — which Google Maps then geocodes to a different place.

Fix the coordinate lookup order:
```
addr.coordinates?.latitude ?? addr.coordinates?.lat ?? addr.latitude ?? addr.lat
addr.coordinates?.longitude ?? addr.coordinates?.lng ?? addr.longitude ?? addr.lng
```
Only fall back to the text address if no coordinates are present. Also update the `hasDest` guard the same way.

### 2. Button placement
Move the Directions button out of its own row and inline it right after the "Near: {landmark}" line inside the address block, so it sits beside "Near: Galiveedu" as a small icon button (rendered inline whether or not a landmark exists — placed at the end of the address text block, indented under the address).

No other files change. No DB or business-logic changes.