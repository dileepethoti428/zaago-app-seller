# Add "View More" to Sales Report Product Summary

Show only the first 5 products in the **Product Summary** table on the Sales Report page, with a "View More" button to reveal more (5 at a time), and a "Show Less" option to collapse back.

## Changes

**File:** `src/pages/SalesReport.tsx`

1. Add `visibleCount` state, default `5`.
2. Reset `visibleCount` to 5 whenever the date range changes (preset or custom).
3. In the Product Summary card:
   - Compute the sorted product-summary array once (via `useMemo`).
   - Render only `.slice(0, visibleCount)` rows.
   - Below the table, if `visibleCount < total`, show a "View More" button (increments by 5). If everything is shown and total > 5, show a "Show Less" button to collapse back to 5.
   - Show a small counter like `Showing X of Y products`.

## Notes

- Pure frontend/presentation change — no hook, query, or PDF export logic touched.
- The downloaded PDF still includes all items (unchanged).
