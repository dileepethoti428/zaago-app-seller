

## Fix: Revenue Using Discounted Prices Instead of Original Prices

### Problem
The `items` JSONB in orders stores both `price` (original) and `discount_percentage`. The revenue RPCs and sales report use `price` directly, ignoring the discount. This inflates revenue.

Example from data: item has `price: 10, discount_percentage: 3` — revenue should be ₹9.70, not ₹10.

### Fix

#### 1. Database migration — Update 3 RPC functions
Replace every occurrence of:
```sql
((item->>'quantity')::numeric) * ((item->>'price')::numeric)
```
With:
```sql
((item->>'quantity')::numeric) * (
  (item->>'price')::numeric * (1 - COALESCE((item->>'discount_percentage')::numeric, 0) / 100)
)
```

This applies to:
- `get_seller_stats_with_period` (6 occurrences across regular_revenue, pending_revenue, pending_subscription_revenue, total_revenue)
- `get_seller_performance_trends` (1 occurrence)
- `get_seller_performance_summary` (1 occurrence)

Also fix subscription revenue lines that use `p.price * s.quantity` — change to apply product discount:
```sql
p.price * (1 - COALESCE(p.discount_percentage, 0) / 100) * s.quantity
```

#### 2. Frontend — `src/hooks/useSalesReport.ts`
Change the item price calculation from `item.price` to apply discount:
```ts
const price = item.price * (1 - (item.discount_percentage || 0) / 100);
```

### Files Changed
- Database migration: update 3 RPC functions to use discounted price
- `src/hooks/useSalesReport.ts` — apply discount_percentage to unit price calculation

