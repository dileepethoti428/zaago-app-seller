# Add Copy Coordinates to Customer Lookup Customer Details

In the Customer Lookup dialog, add a button inside the Customer Details section that copies the customer’s exact lat/long coordinates to the clipboard, so the seller can share the precise location when a product is damaged or wrong.

## What changes

1. In `src/components/CustomerLookupDialog.tsx`:
   - Import `Copy` from `lucide-react` and `toast` from `sonner`.
   - Add a `getCoords` helper that reads coordinates from:
     - `result.customer_info.coordinates` (`latitude/longitude` or `lat/lng`)
     - `result.customer_info.delivery_address?.coordinates` (`latitude/longitude` or `lat/lng`)
   - Add a `copyCoordinates` async helper:
     - If both `lat` and `lng` are present, copy them as `lat,lng`.
     - Show `toast.success('Coordinates copied to clipboard')` on success.
     - Show `toast.error('No coordinates to copy')` when coordinates are missing.
     - Show `toast.error('Failed to copy coordinates')` if the Clipboard API fails.
   - In the Customer Details / Delivery Address block, render a small "Copy Coordinates" button beside the address label.
   - Only show the button when coordinates exist (`lat && lng`).
   - Keep the existing address display and layout unchanged.

## Verification

- TypeScript build passes.
- When a tracked order has customer coordinates, the Customer Details section shows a "Copy Coordinates" button that copies `lat,lng` and shows a success toast.
- When coordinates are missing, the button is hidden and the address block behaves as before.
