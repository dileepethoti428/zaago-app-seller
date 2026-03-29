

## Revenue Bug — `o.total` includes delivery fee, tip, small cart fee

### Problem
The `orders.total` column contains the **customer's grand total** (product cost + delivery fee + small cart fee + tip + taxes). Three RPC functions use `SUM(o.total)` for seller revenue, inflating it with non-product charges.

### Affected Functions

| Function | What it does wrong |
|---|---|
| `get_seller_stats_with_period` | Uses `SUM(o.total)` for `regular_revenue`, `pending_revenue`, `pending_subscription_revenue` |
| `get_seller_performance_trends` | Uses `SUM(o.total)` for `total_revenue` |
| `get_seller_performance_summary` | Uses `SUM(o.total)` for `total_revenue` |

**Already correct:** `get_seller_top_products_analytics` (uses JSONB items `quantity * unit_price`), `useSalesReport.ts` (uses `item.price * item.quantity` when items exist).

### Fix

Replace `SUM(o.total)` with a calculation from the JSONB `items` array — `SUM(item.quantity * item.price)` filtered to seller's products only. This excludes delivery fees, tips, and other charges.

#### 1. `get_seller_stats_with_period` — 3 subqueries to fix
Replace each `SUM(o.total)` with:
```sql
SUM(
  (SELECT COALESCE(SUM((item->>'quantity')::int * (item->>'price')::numeric), 0)
   FROM jsonb_array_elements(o.items) AS item
   WHERE (item->>'seller_id') = seller_user_id::text
      OR (item->>'id')::uuid IN (SELECT id FROM products WHERE seller_id = seller_user_id))
)
```
Applied to: `regular_revenue`, `pending_revenue`, `pending_subscription_revenue`

#### 2. `get_seller_performance_trends`
Replace `SUM(o.total) FILTER (WHERE o.status = 'delivered')` with the same items-based sum.

#### 3. `get_seller_performance_summary`
Same replacement for `total_revenue`.

#### 4. `useSalesReport.ts` — minor fix
The fallback case (empty items array) uses `order.total`. Change it to use `0` instead since we can't determine seller-only amount without items.

### Files Changed
- Database migration: update 3 RPC functions
- `src/hooks/useSalesReport.ts` — fix fallback for empty items

