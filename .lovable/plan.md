

## Show Today's Subscription Forecast on Dashboard

Replace "Tomorrow's Subscription Forecast" on the Dashboard with "Today's Subscription Forecast" so sellers see what subscriptions need to be delivered today rather than tomorrow.

### What changes

1. **New hook** `src/hooks/useTodaySubscriptionForecast.ts`
   - Identical logic to `useTomorrowSubscriptionForecast` but computes **today's date in IST** instead of tomorrow.
   - Queries subscriptions where `next_delivery_date = todayStr`.
   - Keeps all the same vacation-filtering, deduplication, and aggregation logic.

2. **New component** `src/components/TodaySubscriptionForecast.tsx`
   - Mirrors `TomorrowSubscriptionForecast` component exactly.
   - Uses `useTodaySubscriptionForecast` hook.
   - All labels changed from "Tomorrow" to "Today" (title, empty-state text, comment).

3. **Update** `src/pages/Dashboard.tsx`
   - Replace import of `TomorrowSubscriptionForecast` with `TodaySubscriptionForecast`.
   - Replace the component render from `<TomorrowSubscriptionForecast />` to `<TodaySubscriptionForecast />`.
   - Update the comment above it from "Tomorrow's Subscription Forecast" to "Today's Subscription Forecast".

### Why this approach

- `useTomorrowSubscriptionForecast` is also consumed by `useStockAlerts.ts` for stock alerts — keeping it intact avoids breaking that feature.
- Creating a parallel "today" hook/component pair is clean and follows the existing codebase pattern.
- Zero functional changes to the tomorrow forecast itself.

### Files changed
- `src/hooks/useTodaySubscriptionForecast.ts` — new
- `src/components/TodaySubscriptionForecast.tsx` — new
- `src/pages/Dashboard.tsx` — swap import and component usage

