

## Keep Handover Visible All Day (Including After Delivery)

### Problem

In **Subscription Delivery Handover**, agents/products disappear from the card once their `daily_orders` row moves past `pending`/`assigned` (e.g. to `out_for_delivery` or `delivered`). The RPC currently filters:

```sql
AND d.status IN ('pending', 'assigned')
```

So as soon as the partner marks orders delivered, they vanish from the seller's handover view — even though the seller wants to see the full day's handover record until the day ends.

### Fix

Update the RPC `get_seller_subscription_handover_direct` to include the **entire delivery lifecycle** for the day, excluding only cancelled/failed states. New filter:

```sql
AND d.status IN ('pending', 'assigned', 'out_for_delivery', 'delivered')
```

(Cancelled / failed / refunded statuses stay excluded so they don't pollute the handover totals.)

This way the card shows the same data the whole day — whether orders are still pending, in transit, or already delivered.

### Why this is safe

- Handover is read-only aggregation; widening the status set doesn't change any write paths.
- Today's Subscription Forecast uses the same RPC, so it stays in sync automatically.
- Vacation filtering, GROUP BY dedup, and seller scoping are all unchanged.

### Files changed

- New migration — `CREATE OR REPLACE FUNCTION public.get_seller_subscription_handover_direct(...)` with the widened status filter. No frontend changes required.

