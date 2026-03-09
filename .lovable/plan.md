

# Fix: Subscription Handover Not Showing Today's Data

## Root Cause

The handover RPC queries `subscriptions.next_delivery_date`, but:

1. **`daily_orders` table HAS today's data** — Dileep and Siva both have orders for March 9 with status "pending" and agent assigned (ID: 17578977-5353-46fd-8ba0-9d2c058adcec)

2. **`subscriptions.next_delivery_date` has already advanced** — both subscriptions show March 11 as next delivery date (already pointing to the NEXT delivery after today)

3. **The RPC queries the wrong table** — It checks `subscriptions.next_delivery_date = handover_date` which returns nothing because dates were already advanced

**The `daily_orders` table is the actual source of truth** for daily delivery schedules. The `subscriptions.next_delivery_date` represents the NEXT upcoming delivery, not today's.

## Fix Plan

### Update the RPC to query `daily_orders`

Replace the current approach with a query that:
1. Reads from `daily_orders` where `date = handover_date`
2. Joins to get customer, product, and agent details
3. Excludes customers with active vacation periods
4. Groups by agent/product/customer for the UI

```sql
-- Query daily_orders instead of subscriptions.next_delivery_date
SELECT 
  da.agent_id, da.name, da.phone, da.profile_image,
  p.id, p.name, p.unit, p.image_url,
  c.full_name, d.quantity
FROM daily_orders d
JOIN subscriptions s ON s.id = d.subscription_id
JOIN products p ON p.id = s.product_id  
JOIN customers c ON c.id = s.customer_id
LEFT JOIN delivery_agents da ON da.id = d.assigned_agent_id
WHERE d.date = handover_date
  AND p.seller_id = seller_user_id
  AND da.id IS NOT NULL
  AND NOT EXISTS (vacation filter)
```

### Remove auto-advance logic

Since `daily_orders` already contains the correct scheduled dates, the auto-advance logic in the RPC is unnecessary and can cause confusion.

## Files Changed
- **New DB migration** — rewrite `get_seller_subscription_handover_direct` to query `daily_orders` table

