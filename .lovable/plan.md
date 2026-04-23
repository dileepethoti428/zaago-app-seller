

## Add Today/Tomorrow Filter to Subscription Forecast

Add a toggle to the "Today's Subscription Forecast" card so sellers can switch between **Today** and **Tomorrow** views. Default is **Today**.

### What changes

1. **Hook** `src/hooks/useTodaySubscriptionForecast.ts`
   - Accept a parameter `mode: 'today' | 'tomorrow'` (default `'today'`).
   - Compute the target date in IST: today if `mode==='today'`, else `addDays(today, 1)`.
   - Continue calling the same RPC `get_seller_subscription_handover_direct` with that date — guarantees parity with the Handover card for whichever day is selected.
   - Returned `todayFormatted` becomes the formatted label for the selected date.

2. **Component** `src/components/TodaySubscriptionForecast.tsx`
   - Add local state `mode` (`'today' | 'tomorrow'`), default `'today'`.
   - Pass `mode` into the hook.
   - Add a small segmented Tabs control in the header (next to the Refresh button): **Today | Tomorrow**.
   - Dynamic title: `Today's Subscription Forecast` or `Tomorrow's Subscription Forecast` based on `mode`.
   - Dynamic empty-state copy: "No Subscriptions for Today/Tomorrow".
   - Badge "Subscription Forecast" stays the same.

3. **No changes** to Dashboard, no new files, no migration. The existing `useTomorrowSubscriptionForecast` hook (used by stock alerts) stays untouched.

### Why this approach

- Keeps a single card with a clean filter rather than two separate cards.
- Reuses the same handover RPC for both days → forecast always matches what will appear in the Handover card.
- Default `today` preserves current behavior.

### Files changed

- `src/hooks/useTodaySubscriptionForecast.ts` — accept `mode` param, compute date accordingly.
- `src/components/TodaySubscriptionForecast.tsx` — add Today/Tomorrow tabs, dynamic title and empty-state.

