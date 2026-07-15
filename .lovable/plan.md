I found the actual problem.

The View Details page reads `orders.items` directly, and that JSON already contains the unit:
- `Apple` has `unit: "per kg"`
- `Buffalo Milk` has `unit: "per litre"`

But both list pages, `Orders Management` and `Seller Orders`, use the database function `get_seller_specific_orders`. That function rebuilds `seller_items` and currently returns only:
- id
- name
- price
- quantity
- seller_id

It drops the product `unit`, so the frontend has nothing to display on those pages.

Plan:
1. Update the Supabase function `public.get_seller_specific_orders(p_seller_user_id uuid)` so every returned seller item includes:
   - `unit: COALESCE(item->>'unit', p.unit)`
2. Keep the existing frontend display logic that already renders `item.unit || item.product_unit`.
3. Confirm the live function output now returns units inside `seller_items`.
4. Run TypeScript check to ensure the app still compiles.

After this, the same format should show on the list pages:
- `Apple (per kg) × 1`
- `Buffalo Milk (per litre) × 1`