# Delivery Calendar: missing status fix

## What's happening

The calendar only paints a day when a row exists in `daily_orders` for that subscription + date. For many subscriptions, rows are sparse — example: an "everyday" subscription starting 2026‑04‑19 has only 8 `daily_orders` rows across April–May (delivered/pending), so every other day in the month renders blank. Subscriptions where `process-daily-subscriptions` consistently created rows look fine; the others look "empty".

Root cause: the calendar treats absence of a `daily_orders` row as "no delivery scheduled", but the seller's mental model is "this is an everyday/alternative/custom plan, every scheduled date should be visible".

## Fix

Rebuild `useSubscriptionDeliveryHistory` so the calendar is driven by the subscription's own schedule, and `daily_orders` only supplies the actual status for days that have records.

### Steps

1. **Hook signature** — change `useSubscriptionDeliveryHistory(subscriptionId)` to also accept the subscription object (or fetch it inside the hook by id): `start_date`, `end_date`, `subscription_type`, `delivery_days`, `status`.
2. **Compute scheduled dates** for the visible window (last 30 days through 30 days ahead in IST):
   - `everyday` → every date in window from `start_date` to `min(end_date, window_end)`
   - `alternative` → every other day from `start_date`
   - `custom` → dates whose weekday is in `delivery_days`
   - Skip dates before `start_date` or after `end_date`/cancellation
3. **Overlay `daily_orders`** (existing query, extended to also include future dates up to window end, not just `<= today`) and `vacation_compensations`.
4. **Per-day status resolution**:
   - Has `daily_orders` row → use that status (current logic: delivered/missed/in_progress/skipped)
   - No row, date < today, scheduled by plan → `missed` (clickable to compensate) with `dailyOrderId = null`
   - No row, date >= today, scheduled by plan → `scheduled`
   - Not in plan → blank (unchanged)
5. **Compensation click path** — `SubscriptionDeliveryCalendar` already passes `dailyOrderId` (nullable) to `onMissedDateClick`; `CompensationAssignmentDialog` must accept `null` and create the compensation without linking a daily order row. Verify and adjust if needed.
6. **Missed counts hook** (`useSubscriptionMissedCounts`) — same gap exists in the badge count. Mirror the schedule-based computation so the count reflects truly missed scheduled days, not just rows present in `daily_orders`.

### Out of scope

- No backfill of historical `daily_orders` rows.
- No changes to `process-daily-subscriptions` cron behavior.
- No schema changes.

### Files

- `src/hooks/useSubscriptionDeliveryHistory.ts` (rewrite both hooks)
- `src/components/SubscriptionDeliveryCalendar.tsx` (minor: handle null `dailyOrderId`)
- `src/components/CompensationAssignmentDialog.tsx` (allow null `dailyOrderId` if not already)
- `src/components/CustomerDetailsDialog.tsx` (pass subscription schedule fields into the hook)