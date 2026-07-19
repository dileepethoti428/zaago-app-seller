## Add "Directions" button on subscription cards

Add a small button/link right after the customer address on each subscription card in `src/pages/Subscriptions.tsx`. Tapping it opens Google Maps in a new tab with directions from the seller's location to the customer's delivery location, so you can check distance before assigning a delivery partner.

### Behavior
- Button label: "Directions" with a `Navigation` (or `MapPin`) icon.
- On click: open `https://www.google.com/maps/dir/?api=1&origin=<sellerLat>,<sellerLng>&destination=<customerLat>,<customerLng>` in a new tab (`_blank`, `noopener`).
- Fallback when coordinates are missing:
  - If customer has only an address string → open `...&destination=<encoded address>`.
  - If seller coords missing → omit origin (Google will use current location).
- Button is disabled with a tooltip "No address available" only when neither customer coords nor address exist.

### Data sources
- Seller lat/lng: reuse existing `useSellerLocation()` hook (already in project).
- Customer lat/lng/address: read from `subscription.delivery_address` (already fetched in `useSellerSubscriptions`); no schema or query changes.

### Files touched
- `src/pages/Subscriptions.tsx` — add the button in the address block on each card; wire up the URL builder and seller location hook.

No backend, RLS, or data model changes.
