# Finish Book Now, Get Later: sidebar count badge + upcoming orders table

## 1. Count badge on the sidebar button
- The sidebar already fetches the upcoming scheduled order count (`useUpcomingScheduledOrders`) but never shows it.
- Show a small badge with the count next to the "Book Now, Get Later" sidebar item (hidden when the count is 0 or the sidebar is collapsed).

## 2. Upcoming orders table on the Scheduled (Later) page
When the seller opens the "Scheduled (Later)" filter on the Orders page, show a summary table above the order list so they can see at a glance what to prepare:

- **Summary by product**: one row per product — product name, unit/volume (e.g. 500ml), total quantity ordered, and number of orders. A total row at the bottom.
- **Upcoming orders table**: one row per order — delivery date, delivery time slot (e.g. "Sun, 18 Oct · 6:00 AM – 8:00 AM"), customer name, products with quantities, and order status.
- Only upcoming orders are included: scheduled orders with a delivery date of today or later, excluding cancelled, rejected, and delivered orders (same rules as the dashboard card).

## Technical details
- `src/components/Sidebar.tsx`: render the existing `scheduledCount` as a `Badge` inside the nav item (the `badge: 'scheduled'` marker already exists on the nav item type).
- `src/pages/Orders.tsx`: when `activeTab === 'scheduled'`, filter orders with `isScheduledOrder()` + upcoming-date rules, then render two tables using the existing `Table` UI components. Product grouping aggregates `order.items` by product name + unit, summing `quantity`.
- No database changes; reuses `get_seller_specific_orders` data already loaded on the page.
- Verify with a production build after the edits.
