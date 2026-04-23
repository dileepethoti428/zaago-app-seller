

## Fix Today's Subscription Forecast to Match Handover

### Problem

The **Subscription Delivery Handover** correctly shows today's subscriptions, but **Today's Subscription Forecast** is empty. Two completely different data sources are being used:

| Card | Data source |
|---|---|
| Handover (works) | `daily_orders` table (actual generated orders for the date), joined via subscription → product → seller |
| Forecast (broken) | `subscriptions.next_delivery_date = today` |

Once the daily subscription job runs and creates today's `daily_orders` rows, the `next_delivery_date` field on the subscription **advances to the next cycle**. So by the time the seller looks at the dashboard, today's date no longer matches `next_delivery_date` → forecast shows zero.

(The Tomorrow forecast worked because tomorrow's daily_orders haven't been generated yet, so `next_delivery_date` is still tomorrow.)

### Fix

Rewrite `useTodaySubscriptionForecast` to read from the **same source as the handover** so both cards stay in sync:

- Query `daily_orders` for `date = today (IST)` with status `pending` or `assigned`, joined to `subscriptions → products` filtered by `seller_id = current user`.
- Exclude rows whose subscription has an active vacation covering today (same rule as handover RPC).
- Aggregate by product → `totalQuantity`, `subscriptionCount`.

This guarantees: **if it shows in Handover, it shows in Forecast.**

### Implementation

Use the existing RPC `get_seller_subscription_handover_direct(seller_user_id, today)` and aggregate its rows by product on the client. No new RPC, no migration.

```ts
const { data } = await supabase.rpc('get_seller_subscription_handover_direct', {
  seller_user_id: user.id,
  handover_date: todayStr,
});
// group by product_id → sum customer_quantity, count distinct customer rows
```

The component (`TodaySubscriptionForecast.tsx`) does not change — only the hook's data-fetching logic.

### Files changed

- `src/hooks/useTodaySubscriptionForecast.ts` — replace the `subscriptions` query with the handover RPC, aggregate by product.

### Expected result

Today's Subscription Forecast will show the exact same product totals that the Handover card shows for "Today" — fixing the empty/missing data issue.

