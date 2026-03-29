

## Fix: Dashboard Revenue Shows 0 — Field Name Mismatch

### Root Cause

The recent migration replaced `get_seller_stats_with_period` with a simplified version that returns different field names than what the frontend expects.

**RPC now returns:** `total_orders`, `total_revenue`, `pending_orders`, `active_subscriptions`, `prev_total_orders`, `prev_total_revenue`

**Frontend expects:** `total_products`, `active_orders`, `delivered_count`, `regular_revenue`, `subscription_revenue`, `total_revenue`, `active_subscriptions`, `pending_revenue`, `pending_subscription_revenue`, `projected_daily_subscription`

Since the returned JSON keys don't match, every `Number(stats_obj?.regular_revenue)` etc. resolves to `0`.

### Fix

**Update the RPC function** via a database migration to restore all the fields the frontend needs:
- `total_products` — count from products table for this seller
- `active_orders` — orders with status in (placed, confirmed, out_for_delivery)
- `delivered_count` — delivered orders in period
- `regular_revenue` — revenue from non-subscription orders
- `subscription_revenue` — revenue from subscription orders
- `total_revenue` — sum of both
- `active_subscriptions` — count of active subscriptions
- `pending_revenue` — revenue from pending regular orders
- `pending_subscription_revenue` — revenue from pending subscription orders
- `projected_daily_subscription` — estimated daily subscription revenue

The discount-aware item pricing logic (JOIN with products for fallback discount) will be preserved.

### Files Changed
- Database migration: recreate `get_seller_stats_with_period` with all required return fields

