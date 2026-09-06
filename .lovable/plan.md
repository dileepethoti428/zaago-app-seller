# Delivered day details in the subscription calendar

Today, in a subscription's delivery calendar, only missed and compensated days can be clicked. Green "delivered" days do nothing. This adds a details popup for delivered days.

## What you'll see

Tapping a green delivered date opens a small "Delivery Details" card showing:

- Delivery partner name, phone (with a Call button) and vehicle
- Exact date and time the delivery was completed, shown in Indian time
- The expected delivery slot for that subscription (for example "Early Morning"), shown next to the completion time
- An on-time indicator: whether the completion time falls inside the expected slot window, so you can spot late deliveries at a glance

If no completion record exists for that day, the popup says the delivery was marked delivered but no partner/time was recorded.

## Data notes

Checked against the live database:

- Completion records for subscription days live in `delivery_history`, keyed by `order_id` = the `daily_orders` row id, with `completed_at` and `agent_id`.
- `delivery_history.delivery_time_slot` is empty in practice, so the slot will be read from the subscription's own `delivery_time_slot` (values like `morning-early`, `evening-early`).
- Partner details come from `delivery_agents` (name, phone, vehicle_type).

## Technical outline

1. New hook `useDeliveredDayDetails(dailyOrderId, subscriptionId)` — fetches `delivery_history` (completed_at, agent_id, delivery_time_slot) for the daily order, joins `delivery_agents` for name/phone/vehicle, and reads `subscriptions.delivery_time_slot` as fallback slot.
2. New component `src/components/DeliveredDetailDialog.tsx` — presentational dialog matching the existing `CompensationDetailDialog` style, formatting `completed_at` in IST via the existing `timeZone` util and mapping slot keys to readable labels plus their time windows.
3. `src/components/SubscriptionDeliveryCalendar.tsx` — allow clicks on `delivered` days (remove them from the disabled condition), open the new dialog with the day's `dailyOrderId`.
4. Slot label/window map (e.g. `morning-early` 5–8 AM, `morning` 8–11 AM, `evening-early` 4–7 PM, `evening` 7–10 PM) kept in one small config so the on-time check and labels stay consistent; exact windows can be adjusted after review.
5. Legend updated to mention that delivered days are clickable.

No database or business-logic changes; read-only additions.
