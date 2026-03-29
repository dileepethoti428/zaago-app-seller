

## Fix: Revenue Still Using Original Price — Root Cause Found

### The Real Problem

The items JSONB stored in YOUR seller's orders **does not contain `discount_percentage` at all**. It's `null`/missing:

```
Paneer: price=450, discount_percentage=NULL  (product has 11% discount)
Vegetables: price=10, discount_percentage=NULL (product has 3% discount)
```

The RPC functions we updated last time DO have the discount formula `price * (1 - discount_percentage/100)`, but since `discount_percentage` is missing from the JSONB, `COALESCE(NULL, 0)` = 0, so **no discount is applied**.

Some other seller's orders DO have `discount_percentage` stored (e.g., "Cow Ghee" has `discount_percentage: 10`). The issue is the **Checkout page doesn't include `discount_percentage`** when building the order items array.

### Two-Part Fix

#### 1. Fix RPC functions — Use product table's current discount for items missing discount data

Instead of relying solely on `(item->>'discount_percentage')`, JOIN with the `products` table to get the current `discount_percentage` when it's missing from the JSONB. This fixes all historical orders.

Revenue formula becomes:
```sql
quantity * price * (1 - COALESCE(
  (item->>'discount_percentage')::numeric,  -- use stored if available
  p.discount_percentage,                     -- fallback to current product discount
  0
) / 100)
```

Update all 3 functions: `get_seller_stats_with_period`, `get_seller_performance_trends`, `get_seller_performance_summary`.

#### 2. Fix order creation — Store `discount_percentage` in items JSONB going forward

**`src/pages/Checkout.tsx`** (line 81-89): Add `discount_percentage` to the order items array so future orders have it stored.

**`src/pages/CustomerProductDetail.tsx`** (line 129-141): Pass `discount_percentage` through to cart/order flow.

**`src/pages/ProductsCustomer.tsx`** (line 59-69): Include `discount_percentage` in the product data passed to `addToCart`.

**`src/context/CartContext.tsx`**: Store and pass through `discount_percentage`.

**`supabase/functions/process-daily-subscriptions/index.ts`** (line 180-187): Add `discount_percentage` to subscription order items.

#### 3. Fix `useSalesReport.ts` — Use product discount when item doesn't have it

Fetch product discount_percentage alongside order data for items that don't have it stored.

### Files Changed
- Database migration: update 3 RPC functions to JOIN products table for discount fallback
- `src/pages/Checkout.tsx` — include discount_percentage in order items
- `src/pages/ProductsCustomer.tsx` — pass discount_percentage to addToCart
- `src/pages/CustomerProductDetail.tsx` — pass discount_percentage to addToCart
- `src/context/CartContext.tsx` — store/pass discount_percentage
- `supabase/functions/process-daily-subscriptions/index.ts` — add discount_percentage to subscription items
- `src/hooks/useSalesReport.ts` — fallback to product's current discount

