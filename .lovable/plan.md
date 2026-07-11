## Goal
On the Subscriptions page, display each subscription's product as `"Onion 500g"` instead of just `"Onion (x1)"` by appending the product's unit/quantity from the product catalog.

## Changes

### 1. Data layer
- Update `src/hooks/useSubscriptions.ts`:
  - Include `unit` in the `products` relation select.
  - Add `unit: string | null` to the `SubscriptionWithDetails.products` type.

### 2. Subscription list card
- Update `src/pages/Subscriptions.tsx`:
  - Replace the current product line `{product.name} (x{subscription.quantity})` with `{product.name} {product.unit}` (e.g., "Onion 500g").
  - Keep the existing fallback to "Unknown Product" when product data is missing.

### 3. Customer details dialog (consistency)
- Update `src/components/CustomerDetailsDialog.tsx`:
  - Add `product_unit?: string` to the `SubscriptionInfo` interface.
  - Pass `product_unit` from `Subscriptions.tsx` when opening the dialog.
  - Display the product name + unit in the Details tab so the View dialog matches the list card.

## Out of scope
- Other forecast/summary components (e.g., `TodayCompensationBanner`, `useTodaySubscriptionForecast`) are not part of the main Subscriptions page and will not be changed unless requested.
- No database migration is needed; the `unit` column already exists on `products`.

## Expected result
Every subscription card on `/subscriptions` shows the product name followed by its catalog unit, matching the requested `"Onion 500g"` format.