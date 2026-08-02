# Move daily operations sections to their own page

Today's Orders Summary, Today's Subscription Forecast, and Subscription Delivery Handover currently sit on the Dashboard (`src/pages/Dashboard.tsx`, lines 147-153). They move to a new dedicated page.

## What changes

- New page "Daily Operations" at `/daily-operations` containing, in order:
  1. Today's Orders Summary
  2. Today's Subscription Forecast
  3. Subscription Delivery Handover
- Page gets a short header (title + one-line description) matching the styling of other pages.
- These three sections are removed from the Dashboard; the rest of the Dashboard stays as is.
- Sidebar gets a "Daily Operations" link (ClipboardList icon), placed right after Dashboard.

## Technical notes

- Add `src/pages/DailyOperations.tsx` rendering the existing `TodaysOrdersSummary`, `TodaySubscriptionForecast`, and `SubscriptionHandoverCard` components unchanged — no logic or hook changes.
- Register the route under the `Layout` route group in `src/App.tsx`.
- Add the nav entry in `src/components/Sidebar.tsx`.
