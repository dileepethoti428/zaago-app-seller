

# Fix: Data Mismatch Between Forecast and Handover

## Root Cause (3 issues found)

### 1. Dileep has 10 duplicate active subscriptions
Dileep has **10 separate active subscription records** for the same product (Vegetables), all with `next_delivery_date = 2026-03-08`. These were created on different dates (Feb 13 to Mar 6) and appear to be test/duplicate entries. This inflates counts in both views.

### 2. Different filtering logic
- **Forecast** uses complex client-side subscription_type logic (`shouldDeliverTomorrow` checking daily/alternate/weekend/custom rules)
- **Handover** simply checks `next_delivery_date = handover_date`

These two approaches produce different results for the same date.

### 3. Handover excludes unassigned subscriptions
- **Handover** only shows subscriptions where an agent is assigned (3 of Dileep's 10 subs, 1 Poori, 1 Siva = 5 shown)
- **Forecast** shows ALL subscriptions regardless of agent assignment (10 Dileep + 1 Poori + 1 Poornima + 2 Siva = 14)
- **Poornima Reddy** appears in forecast but NOT in handover (no agent assigned)

### About Siva
Siva's vacation record is `start_date: 2026-03-05, end_date: 2026-03-05` -- it only covered March 5. Siva is **not on vacation** for March 8, so Siva correctly appears in tomorrow's data. If Siva should still be on vacation, the vacation end date needs to be extended in the app.

## Fix Plan

### 1. Clean up duplicate subscriptions (DB migration)
Deduplicate Dileep's subscriptions: keep only the most recent active subscription per customer + product combination. Deactivate the rest.

### 2. Update Forecast to use `next_delivery_date`
Replace the complex `shouldDeliverTomorrow` client-side logic in `useTomorrowSubscriptionForecast.ts` with a simple query filtering by `next_delivery_date = tomorrow`. This matches the handover RPC logic, ensuring both views use the same source of truth.

Also add the same vacation period exclusion filter.

### 3. Add deduplication guard in handover RPC
Update the RPC to `GROUP BY customer_id, product_id` so even if duplicate subscriptions exist, each customer only appears once per product with summed quantity.

## Files Changed
- **New DB migration** -- deactivate duplicate subscriptions, update handover RPC with dedup
- **`src/hooks/useTomorrowSubscriptionForecast.ts`** -- simplify to use `next_delivery_date = tomorrow` filter with vacation exclusion

