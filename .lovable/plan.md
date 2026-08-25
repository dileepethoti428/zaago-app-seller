# Real trend percentages on Dashboard stat cards

Today the four badges (+12%, +5%, +18%, +23%) on the Dashboard stat cards are hardcoded strings — they never change and do not reflect any data. They will be replaced with real period-over-period change.

## What the user will see

Each stat card shows the change versus the equivalent previous period:

- Today -> compared with yesterday
- This Week -> compared with last week (same weekday-to-now span)
- This Month -> compared with last month

Rules:
- Positive change: green with an up arrow (e.g. "+18%").
- Negative change: red with a down arrow (e.g. "-9%").
- No change / both periods zero: neutral grey "0%".
- Previous period was 0 and current is > 0: show "New" instead of a meaningless infinite percentage.
- While data is loading, no badge is shown (avoids flashing a fake number).

Total Products is not period-based, so its badge is replaced with the count of products added in the selected period (e.g. "+2 new") or hidden when none were added.

## Technical details

1. Database: add a new SECURITY DEFINER function `get_seller_stats_for_range(seller_uuid uuid, start_ts timestamptz, end_ts timestamptz)` that returns the same JSON shape as the existing `get_seller_stats_with_period`, but bounded by an explicit range (`created_at >= start_ts AND created_at < end_ts`), plus a `products_added` count. Revenue math, IST handling, discount logic and the seller scoping stay identical to the existing function. Grant EXECUTE to `authenticated`.

2. `src/pages/Dashboard.tsx`: compute current and previous IST ranges for the selected period, call the new RPC twice (current + previous) in parallel, and store both results in state. Keep the existing `get_seller_stats_with_period` call or replace it with the current-range call so there is a single source of truth.

3. Add a small `TrendBadge` presentational piece in the stats grid that takes current/previous numbers and renders the coloured percentage, arrow, "New", or nothing — using existing semantic tokens (`text-zaago-green`, destructive, muted) rather than hardcoded colours.
