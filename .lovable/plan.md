# Remove "Daily Operations" title and consolidate section descriptions

## Goal
On the Daily Operations page, remove the main "Daily Operations" heading at the top. Keep the descriptive subtitle text — "Today's orders, subscription forecast and delivery partner handover in one place." — visible near the top of the page so the three sections remain clearly introduced.

## Current state
`src/pages/DailyOperations.tsx` renders:
- A top heading: `<h1>Daily Operations</h1>`
- A subtitle: "Today's orders, subscription forecast and delivery partner handover in one place."
- Three section components stacked below: `TodaysOrdersSummary`, `TodaySubscriptionForecast`, `SubscriptionHandoverCard`

## Changes
1. In `src/pages/DailyOperations.tsx`:
   - Remove the `<h1>` "Daily Operations" title.
   - Keep the subtitle paragraph at the top, possibly styled as a page intro.
   - Leave the three section components unchanged.

## Out of scope
- No changes to `TodaysOrdersSummary`, `TodaySubscriptionForecast`, or `SubscriptionHandoverCard`.
- No routing, sidebar, or navigation changes.
- No backend or data logic changes.

## Verification
- Build/typecheck passes.
- Visually confirm the page no longer shows "Daily Operations" as a heading and the subtitle remains visible at the top.