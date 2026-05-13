## Bulk Activate/Deactivate All Products Button

### Goal
Add a single button to the Products page that lets a seller instantly activate or deactivate **all** their products at once. Use case: shop closes at 12 AM and the seller wants to hide everything from customers with one tap.

### UI Changes

**1. New bulk-toggle button** placed in the page header row (next to "Add via Form" / "Quick Add"). Label adapts dynamically:
- If any products are active: **"Deactivate All"** (with count, e.g. "Deactivate All (5)")
- If all products are inactive: **"Activate All"**

**2. Confirmation dialog** on click:
- Title: "Deactivate All Products?" / "Activate All Products?"
- Body explains the impact: "This will hide all X products from customers." or "This will make all X products visible to customers."
- Actions: Cancel / Confirm

**3. Loading & feedback:**
- Button disabled + spinner while the bulk update is in flight
- Success toast on completion
- Error toast if the update fails

### Implementation

- **File:** `src/pages/Products.tsx` only. No new hooks or backend changes needed.
- Use the existing `supabase` client with a single query:
  ```ts
  await supabase.from('products')
    .update({ is_active: targetState })
    .eq('seller_id', user.id);
  ```
- The existing realtime `postgres_changes` subscription on the `products` table already refreshes the local list automatically when the bulk update completes, so no manual cache invalidation is required.

### No database changes required
The `products` table already has `is_active` and `seller_id` columns. The existing RLS policy ` Sellers can update their own products` will permit this bulk update as long as the filter is `seller_id = auth.uid()`.
