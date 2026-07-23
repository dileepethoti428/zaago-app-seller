## Goal
Make it obvious on Seller Orders and Orders Management which orders are "Book Now, Get Later" (scheduled for a future date/slot) and when the seller needs to pack them.

## What defines a scheduled order
An order is treated as "Book Now, Get Later" when it has a `delivery_time_slot` set (e.g. `18:00-20:00`) OR its `delivery_date` is later than the order's `created_at` date (IST). Otherwise it's treated as immediate.

## Changes

### 1. `src/pages/Orders.tsx` (Orders Management)
- On each order card add a small badge row when the order is scheduled:
  - Blue "Scheduled" badge with a `Clock` icon
  - Line: `Deliver: <delivery_date formatted> · <delivery_time_slot>` (slot omitted if null)
  - Line: `Pack by: <slot start − 1 hour>` (or `delivery_time − 1 hour` fallback) so the seller knows when to have it ready
- Add a filter chip "Scheduled" alongside existing status filters that shows only scheduled orders, sorted by delivery date/slot ascending.

### 2. `src/pages/CustomerOrders.tsx` (Seller Orders per customer)
- Same badge + "Deliver / Pack by" lines under each order header.

### 3. `src/pages/OrderDetail.tsx`
- In the order summary card, when scheduled, show a highlighted "Scheduled Delivery" block with:
  - Delivery date, slot, and computed "Pack by" time.

### 4. Shared helper `src/utils/scheduledOrder.ts` (new)
- `isScheduledOrder(order)` — boolean
- `getPackByTime(order)` — returns a Date/label for when to pack
- `formatDeliveryWindow(order)` — returns e.g. `"Fri 24 Jul · 6:00 – 8:00 PM"`
Used by all three pages so formatting stays consistent.

## Out of scope
- No DB schema changes (`delivery_date`, `delivery_time`, `delivery_time_slot` already exist).
- No changes to order creation or the customer app.
