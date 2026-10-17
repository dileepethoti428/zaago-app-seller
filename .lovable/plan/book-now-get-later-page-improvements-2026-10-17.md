# Book Now, Get Later page improvements

## 1. Date filter: default to the next delivery date, as a dropdown
- The forecast opens on the **next upcoming delivery date** (e.g. Mon, 19 Oct), not "All Upcoming".
- Swap the row of date chips for one compact **date dropdown** that opens when tapped, so it fits on a phone screen. Each option shows the date and its order count, e.g. "Mon, 19 Oct (12 orders)".
- "All Upcoming" stays as the last option in the dropdown.

## 2. Upcoming Scheduled Orders follows the same filter
- The orders list under the forecast shows only orders for the date picked in the dropdown. If "All Upcoming" is picked, it shows every upcoming order.
- It shows 5 orders first. A **View More** button shows 5 more each time it's tapped, and **Show Less** collapses the list again.
- On phones, each order becomes a stacked card instead of a wide table, so nothing gets cut off. It shows the delivery time, the Pack by time, the customer, the products with units and quantities, and the status.

## 3. Accept and Reject on each order
- Orders that are new, pending or placed get **Accept** and **Reject** buttons. These work the same way as the buttons on the order cards further down the page.
- Reject asks for confirmation first. The list refreshes after either action.

## Technical details
- Move the selected-date state up into `Orders.tsx` and pass it to `ScheduledOrdersForecast` as `selected`/`onSelectedChange`. Use the shadcn `Select` for the dropdown. The default is the earliest `delivery_date` among `upcomingScheduled`, and it is reset if that date disappears.
- Build the filtered list from `upcomingScheduled` using the selected date, sort it by date, and keep a `visibleCount` (starts at 5, goes up by 5). Reset `visibleCount` when the date changes.
- Change the table to a card list that works on phones. Reuse `acceptOrder`/`rejectOrder` from `useSellerOrderActions` with the `isProcessing` state, and add an AlertDialog to confirm Reject. Existing `orderStatusUpdated` events already refresh the list.
