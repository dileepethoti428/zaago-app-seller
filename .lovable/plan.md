

# Fix: Subscription Handover RPC Failing Due to Wrong Argument Order

## Root Cause

The `get_seller_subscription_handover_direct` RPC calls `calculate_next_delivery_date_v2` with arguments in the **wrong order**:

**Current (broken):** `calculate_next_delivery_date_v2(handover_date::text, s.delivery_days, s.subscription_type)`
- Passes: `(text, text[], text)`

**Expected signature:** `calculate_next_delivery_date_v2(p_current_date date, p_subscription_type text, p_delivery_days text[])`
- Expects: `(date, text, text[])`

## Fix

Single migration to replace the RPC, fixing the argument order:

```sql
UPDATE subscriptions s
SET next_delivery_date = calculate_next_delivery_date_v2(
  handover_date,           -- date, not text
  s.subscription_type,     -- swap: type before days
  s.delivery_days           -- swap: days last
)
```

## Files Changed
- **New DB migration** — fixes the `calculate_next_delivery_date_v2` call argument order in the `get_seller_subscription_handover_direct` function

No frontend code changes needed.

