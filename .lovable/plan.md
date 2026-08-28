Change Subscriptions "Copy Address" to "Copy Coordinates"

## Goal
Replace the existing "Copy Address" action on subscription cards with a "Copy Coordinates" action so delivery partners can paste exact lat/long values (more accurate than a text address) into maps or chat apps.

## Changes
1. In `src/pages/Subscriptions.tsx`, update the `copyAddress` helper:
   - Rename it to `copyCoordinates`.
   - Read coordinates using the existing `getCoords()` helper (checks `deliveryAddress.coordinates.latitude/longitude`, `lat/lng`, and top-level `latitude/longitude` fields).
   - If both `lat` and `lng` are present, copy them as a single comma-separated string (e.g., `12.3456,78.9012`).
   - If coordinates are missing, show a `toast.error('No coordinates to copy')`.
   - Update success/error toast text to refer to coordinates.

2. Update the UI button that currently renders "Copy Address":
   - Change label to "Copy Coordinates".
   - Keep the `<Copy />` icon.
   - Show the button only when coordinates exist (use the same `lat && lng` check already used for Directions).
   - Remove the separate `hasAddress` condition that previously gated the copy button; the button should now gate on `hasCoords`.

3. Clean up:
   - Remove any now-unused address-formatting variables inside the copy helper if they are no longer referenced.
   - Ensure the existing `Directions` button remains unchanged.

## Verification
- TypeScript build passes.
- On a subscription card with stored coordinates, the "Copy Coordinates" button appears, copies `lat,lng` to the clipboard, and shows a success toast.
- On a subscription card without coordinates, the button is hidden and the Directions button behavior is unchanged.
