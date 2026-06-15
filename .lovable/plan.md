# Fix Top Products revenue calculation

## Problem
The Dashboard's **Top Products** card shows revenue at the **original (undiscounted) price**. The RPC `get_seller_top_products_analytics` multiplies quantity by `item.unit_price` (which doesn't exist on order items) and falls back to `p.price` — neither applies the product discount.

This is inconsistent with the project's revenue rule:
`revenue = quantity * price * (1 - discount/100)` (with fallback to product's current discount when historical item lacks one).

## Fix
Update the RPC `public.get_seller_top_products_analytics` via a new migration to compute revenue using discount, in both the `SELECT` and the `ORDER BY`:

```sql
SUM(
  (item->>'quantity')::int *
  COALESCE((item->>'price')::numeric, (item->>'base_price')::numeric, p.price) *
  (1 - COALESCE((item->>'discount_percentage')::numeric, p.discount_percentage, 0) / 100)
)
```

Apply the same expression in the `ORDER BY` branch for `sort_by = 'revenue'`. Keep all other logic (seller filter, status filter, period window, quantity/orders sorting) unchanged.

## Scope
- One migration replacing the function body.
- No frontend changes (`TopProductsCard.tsx`, `useTopProductsAnalytics.ts` untouched — return shape stays the same).
- No impact on Performance Trends or other revenue queries.
