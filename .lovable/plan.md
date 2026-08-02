# Move analytics sections to their own page

Move four sections off the Dashboard into a new **Insights & Stock** page, mirroring how Daily Operations was done.

## Sections moved
1. Stock Alerts & Refill Suggestions
2. Weekly Refill Trend Report
3. Top Products
4. Performance Trends

## Changes
- New `src/pages/Insights.tsx` with a page header and the four components stacked, same motion/spacing pattern as `DailyOperations.tsx`.
- `src/pages/Dashboard.tsx`: remove those four renders and their imports; the Dashboard keeps revenue/stats and the rest.
- `src/App.tsx`: add `insights` route inside the `Layout` route.
- `src/components/Sidebar.tsx`: add an "Insights" link (BarChart3 icon) right after Daily Operations.

No data/hook or business-logic changes — components move as-is.
