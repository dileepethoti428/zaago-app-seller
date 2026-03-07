

# Fix: Subscription Handover - Customer Visibility + Date Advancement

## Root Cause Analysis

After querying the database directly:

1. **Siva IS excluded** from today's handover — the vacation filter works correctly
2. **The 2 orders belong to "Dileep"**, not Siva — but the handover UI doesn't show customer names, so this isn't visible to you
3. **Siva's `next_delivery_date` is stuck at Mar 5** — the edge function that advances this date has hit its execution limit and can't run

## What We'll Fix

### 1. Add Customer-Level Detail to Handover
Update the RPC and UI to show individual customer names and quantities under each product, so you can verify exactly whose orders are included.

**RPC change**: Return individual subscription rows with customer names (from `customers` table) instead of just aggregated totals.

**UI change**: Under each product in the `AgentHandoverCard`, show a breakdown like:
```
Vegetables — 2 per piece
  • Dileep — 1
  • Dileep — 1
```

### 2. Fix `next_delivery_date` Advancement Without Edge Functions
Since the edge function can't run, we need to advance `next_delivery_date` directly. Two options:
- **Option A**: A database trigger/function that auto-advances `next_delivery_date` when the current date passes it
- **Option B**: Advance dates client-side when the seller views the handover (detect stale dates and update them)

I'll go with **Option A** — a SQL function that the handover RPC calls to auto-fix stale `next_delivery_date` values before returning results. This ensures dates stay current without edge functions.

## Files Changed

- **New DB migration** — Update `get_seller_subscription_handover_direct` to include customer names per subscription, and add a helper function to advance stale `next_delivery_date` values
- **`src/hooks/useSubscriptionHandover.ts`** — Update types to include customer-level breakdown
- **`src/components/handover/AgentHandoverCard.tsx`** — Show customer names under each product

## Technical Detail

### Updated RPC Return Structure
```sql
-- Returns one row per agent + product + customer (instead of just agent + product)
SELECT
  da.agent_id, da.name, ...,
  p.id AS product_id, p.name AS product_name, ...,
  c.full_name AS customer_name,
  s.quantity AS customer_quantity
FROM subscriptions s
JOIN customers c ON c.id = s.customer_id
...
```

### Stale Date Auto-Fix
```sql
-- Before returning handover data, advance any stale next_delivery_dates
UPDATE subscriptions
SET next_delivery_date = calculate_next_delivery(delivery_days, subscription_type, CURRENT_DATE)
WHERE is_active = true
  AND next_delivery_date < CURRENT_DATE
  AND seller products match
```

This runs only when handover is viewed, fixing stale dates on-the-fly.

