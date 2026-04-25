## Add Seller-Only Cost Price (Source Price) on Products Page

### Goal

On the **Product Inventory** (`/products`) page, add a small button on each product row that, when clicked, reveals the **original/source price** the seller paid to procure the product. This is for the seller's **internal reference only** — never shown to customers or delivery partners.

### What changes

**1. Database — new column on `products`**

Add a new nullable column `cost_price NUMERIC` to `public.products`. This stores the seller's procurement/source price.

- Nullable (existing products won't have a value yet).
- RLS already restricts `products` SELECT/UPDATE to the owning seller for write paths, but we will additionally make sure the value is only ever read/edited from seller-only screens. The customer-facing flows (`get_products_within_range` RPC, `CustomerProductDetail`, etc.) do not select `cost_price`, so it stays hidden from customers.

**2. Products page (`src/pages/Products.tsx`)**

- Extend the local `Product` interface with `cost_price: number | null`.
- For each product row, add an **"Eye" toggle button** next to the selling price (`₹{product.price}`).
  - Default state: hidden, shows only a small label like `Cost: ••••` with an eye icon.
  - On click: toggles to show `Cost: ₹{cost_price}` (or `Not set` if null).
  - Clicking the button must NOT navigate to the product detail page (`stopPropagation`).
- Track which product IDs are currently "revealed" in a local `Set<string>` state (so each row toggles independently).
- A small "Internal only" muted helper tag next to the cost so the seller knows it's private.

**3. Setting / editing the cost price**

Two options to set the value — pick the simplest that fits the existing UX:

- **Inline edit**: when revealed, render a small `Edit` icon next to the cost. Clicking opens a tiny inline input + Save/Cancel that updates `products.cost_price` for that row.
- (Add Product / Edit Product forms can be extended later — out of scope for this change to keep it focused on the Products list reveal feature.)

This keeps the change scoped to the Products page only, as requested.

### Visibility / Security

- `cost_price` is only ever selected in seller-scoped queries (`Products.tsx` filters by `seller_id = user.id`).
- Customer-facing RPC `get_products_within_range` and `CustomerProductDetail` do not (and will not) select this column.
- Existing RLS on `products` already restricts UPDATE to the owning seller, so the inline edit is safe.

### Files changed

- New migration — `ALTER TABLE public.products ADD COLUMN cost_price numeric;`
- `src/pages/Products.tsx` — add `cost_price` to interface, reveal-toggle button, inline edit UI, update mutation.

### Expected result

On `/products`, each product row shows the public selling price as today, plus a hidden "Cost" pill with an eye icon. Clicking the eye reveals the seller's source price (and lets them set/edit it inline). Customers and delivery partners never see this value.
