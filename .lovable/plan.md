

# Fix Plan: Revenue Data, Sales Report, and Config Restoration

## Problem Summary

Three issues have been identified:

1. **Revenue/Dashboard shows zero data** -- The `get_seller_stats_with_period` RPC function is completely broken due to a variable naming conflict. The function uses a variable called `start_date`, but the `subscriptions` table also has a column called `start_date`. PostgreSQL cannot tell which one you mean, so the entire function fails silently, returning no data to both the homepage and dashboard.

2. **Sales Report shows zero data** -- The sales report query tries to fetch `product_name` from the `order_items` table, but that column does not exist. The table only has `product_id`. The query needs to join with the `products` table to get the product name.

3. **Edge function configs were lost** -- When the Supabase project was reconnected, the `config.toml` file was overwritten and lost all edge function JWT verification settings, which could cause edge functions to reject requests.

## Fixes

### Fix 1: Repair the RPC Function (Database Migration)

Rename the `start_date` variable to `v_start_date` inside the `get_seller_stats_with_period` function to avoid the naming conflict with the `subscriptions.start_date` column. The function logic stays exactly the same.

### Fix 2: Fix Sales Report Query

Update `src/hooks/useSalesReport.ts` to:
- Remove `product_name` from the `order_items` select
- Instead, join through `product_id` to the `products` table to get `products(name)`
- Map the product name from the joined data

### Fix 3: Restore Edge Function Configs

Restore `supabase/config.toml` with all the edge function `verify_jwt = false` settings that were lost during reconnection.

---

## Technical Details

### Database Change (SQL Migration)

Replace the `get_seller_stats_with_period` function, changing every reference from `start_date` to `v_start_date` to resolve the PostgreSQL ambiguity error.

### Code Changes

| File | Change |
|------|--------|
| `src/hooks/useSalesReport.ts` | Update select query to join `order_items.product_id` with `products(name)` instead of selecting non-existent `product_name` column |
| `supabase/config.toml` | Restore all 12 edge function configurations with `verify_jwt = false` |

