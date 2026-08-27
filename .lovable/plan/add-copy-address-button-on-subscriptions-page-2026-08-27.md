# Add Copy Address Button on Subscriptions Page

Add a one-tap "Copy Address" button to each subscription card so sellers can copy the customer’s delivery address to the clipboard.

## What changes

- In `src/pages/Subscriptions.tsx`, add a small "Copy" button beside the existing "Directions" button inside the address block of each subscription card.
- Build a clean, single-line address string from `delivery_address.full_address`, `city`, `state`, `pincode`, and `landmark` when available.
- Use `navigator.clipboard.writeText(...)` to copy the address.
- Show a brief `toast.success('Address copied')` confirmation after copying.
- If clipboard access fails, show `toast.error('Failed to copy address')`.
- Import the `Copy` icon from `lucide-react` for the button.
- Keep the existing "Directions" button and layout unchanged.

## Technical notes

- No database or backend changes are required.
- No new dependencies are needed; `lucide-react` and `sonner` are already used.
- The copy action is purely client-side and scoped to the existing subscription card UI.
