# Remove Dashboard Trend Badges

## Changes
- Remove the percentage, `New`, and `+N new` badges from all Revenue Period summary cards.
- Keep Total Products, Active Orders, Deliveries, Revenue, and their selected-period totals unchanged.
- Remove the unused trend component, trend icons, previous-period state, and previous-period comparison request from the dashboard.
- Continue fetching the selected current period in IST so the displayed totals remain accurate.

## Verification
- Confirm no trend labels appear for Today, This Week, or This Month.
- Confirm changing the Revenue Period still refreshes all four totals.
- Check the project build and dashboard rendering.
