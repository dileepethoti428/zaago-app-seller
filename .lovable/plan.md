

# Fix: Subscription Handover Shows Orders for Customers on Vacation

## Root Cause

The `process-daily-subscriptions` edge function creates daily orders **without first checking** if the subscription has an active vacation period covering today. It only uses vacation data to calculate the *next* delivery date (lines 226-249), but never skips order creation for the current day.

The RPC function `get_seller_subscription_handover_data` correctly excludes vacation customers from the handover view, but the underlying `daily_orders` records are already created, and the handover query runs against `daily_orders` -- so if the vacation check in the RPC works, the real problem is that orders created by `process-daily-subscriptions` are **not being filtered** before insertion.

## Fix

**Update `process-daily-subscriptions` edge function** to check for active vacation periods BEFORE creating the order. Add a vacation check right after the `shouldDeliver` logic (around line 100):

```typescript
// Check if subscription is on vacation today
const { data: activeVacation } = await supabase
  .from('subscription_vacation_periods')
  .select('id')
  .eq('subscription_id', subscription.id)
  .eq('status', 'active')
  .lte('start_date', today)
  .gte('end_date', today)
  .limit(1);

if (activeVacation && activeVacation.length > 0) {
  console.log(`🏖️ Skipping subscription ${subscription.id} - customer on vacation`);
  // Still advance next_delivery_date past vacation
  // ... (keep existing vacation skip logic for next date)
  continue;
}
```

This ensures:
1. No `daily_orders` or `orders` records are created for vacation days
2. The `next_delivery_date` is still advanced past the vacation period
3. The handover view stays clean without relying solely on the RPC filter

**File changed:**
- `supabase/functions/process-daily-subscriptions/index.ts`

No database migration needed.

