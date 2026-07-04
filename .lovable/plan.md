## Goal

Let sellers mark whether a product is subscribable (e.g. milk = yes, rice = no) from the Add/Edit Product pages. The customer app already shows a Subscribe button on every item — after this change, it will only show it for products the seller explicitly enabled.

## Changes

### 1. Database (migration)
Add a new column to `public.products`:
- `is_subscribable boolean NOT NULL DEFAULT false`

No RLS/policy changes needed — existing seller policies already cover updates to their own products.

### 2. Add Product page (`src/pages/AddProduct.tsx`)
- Add a Switch field: **"Available as subscription"** with helper text: *"Enable this if customers can subscribe to receive this product regularly (e.g. daily milk). Leave off for one-off purchases (e.g. rice)."*
- Default: OFF.
- Include `is_subscribable` in the insert payload.

### 3. Edit Product page (`src/pages/EditProduct.tsx`)
- Same Switch field, pre-filled from the loaded product.
- Include `is_subscribable` in the update payload.

### 4. Product Detail page (`src/pages/ProductDetail.tsx`)
- Show a small badge "Subscription enabled" when `is_subscribable` is true (read-only display).

### 5. Types
- Regenerated automatically after the migration so `is_subscribable` is available in `products` inserts/updates.

## Out of scope (customer app)

The customer app is a separate project. Once this column exists, that app should conditionally render its Subscribe button using `product.is_subscribable`. I can share the exact snippet, but the change itself must be made in the customer app repo — not here.

## Verification
- Add a new product with the toggle ON → row saved with `is_subscribable=true`.
- Add without toggling → `is_subscribable=false`.
- Edit an existing product, flip the toggle, save → value persists.
- Product Detail shows the badge only when enabled.
