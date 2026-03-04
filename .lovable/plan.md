

# Replace Edge Function with Client-Side Scan for Missed Deliveries

## Problem
The `scan-missed-deliveries` edge function fails with "Failed to send request to Edge Function". This is likely due to the external Supabase project's edge function not being deployed or accessible.

## Solution
Move all the scanning logic directly into the `useScanMissedDeliveries` hook. The edge function only uses standard Supabase queries (select, insert) -- all of which can be done client-side with the authenticated user's session. No service role key is actually needed since the seller is querying their own data through RLS.

### File: `src/hooks/useScanMissedDeliveries.ts` -- Full rewrite

Replace the `supabase.functions.invoke()` call with direct client-side logic that mirrors the edge function:

1. **Scan regular orders** with failed statuses (`delivery_failed`, `undelivered`, `technical_error`, `agent_unavailable`, `not_delivered`) for the seller in the last N days
2. **Scan daily_orders** with failed statuses (`failed`, `undelivered`, `cancelled_agent`, `not_delivered`, `delivery_failed`)  
3. **Scan stale pending daily_orders** (status = `pending`, date < today)
4. For each found order, check if a compensation already exists (by `order_id` or `daily_order_id` or `subscription_id + date`)
5. If no compensation exists, look up subscription/product details and insert a new `vacation_compensations` record
6. Check for active vacation periods to set the correct `reason`

The logic is identical to what the edge function does, just executed client-side. Each compensation is saved incrementally (one insert at a time) so partial progress is preserved.

### Helper function for IST date
Reuse the same `getISTDateString` logic from the edge function.

### No other files need changes
The hook's return interface (`ScanResult`) stays the same, so the VacationCompensations page works without modification.

