# Product availability days + Book Now, Get Later on Dashboard

## 1. Available days picker (Add Product + Edit Product)
Products already store delivery days (shown in the customer app as "Delivery days: any day"), but sellers can't set them today.

- Add an "Available Days" section with Mon–Sun chips the seller taps to select.
- Quick buttons: "Every day" and "Clear".
- No days selected = available any day (keeps current behaviour for existing products).
- Edit Product loads the saved days and lets the seller change them.
- Show the chosen days in the Live Preview (e.g. "Available: Sun").

## 2. "Book Now, Get Later" button on Dashboard
- New prominent card near the top of the Dashboard: "Upcoming Scheduled Orders" with a count of upcoming booked orders (today and later), plus the next delivery date and how many orders are due that day (e.g. "Sun 18 Oct · 12 orders").
- Tapping it opens the Orders page with the "Scheduled (Later)" filter already selected.
- Also add the same button in Quick Actions.

## Technical details
- Use existing `products.delivery_days` (text[]) — store lowercase day names (`monday`…`sunday`); empty/null = any day. No database change.
- Scheduled count uses `get_seller_specific_orders` / existing order RPC filtered by `isScheduledOrder()` and `delivery_date >= today (IST)`, excluding cancelled/rejected/delivered.
- Orders page reads `?filter=scheduled` from the URL to preselect the filter.
