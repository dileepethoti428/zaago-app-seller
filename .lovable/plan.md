## Goal
Show the product volume/unit (e.g., "500g", "per litre") next to each product name in the orders list and in the order details view so sellers can tell variants apart.

## Data source
Each item stored in `orders.items` already has a `unit` field (values like `"500g"`, `"per litre"`, `"per piece"`). No DB change needed — just render it.

## Changes

1. **`src/pages/CustomerOrders.tsx`** — "Your Products in this Order" list (around line 656).
   Render the product name with the unit appended when present:
   `Buffalo Milk — 500ml` (name + `item.unit` shown as a muted suffix or small chip). Fall back to just the name when `unit` is empty.

2. **`src/pages/OrderDetail.tsx`** — "Order Items" card (around line 353, `item.name` line).
   Same treatment: show `item.name` with `item.unit` beside it (small muted text or badge).

3. **`src/pages/Orders.tsx`** — the row currently shows only "N items". Add a compact per-item summary line under the order header listing each product as `Name (unit) × qty`, e.g. `Buffalo Milk (500ml) × 2`, so the seller sees volumes without opening details. Keep the existing count.

## Out of scope
- No changes to how items are stored, no migration, no changes to subscription cards (already handled previously).
- No visual redesign beyond the small unit label.