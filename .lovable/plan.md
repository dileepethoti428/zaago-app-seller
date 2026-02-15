

# Subscription Page Enhancements

## Feature 1: Refresh Button

Add a manual refresh button next to the page title so you can reload subscription data anytime.

---

## Feature 2: Enhanced "View" with Delivery Calendar and Compensation Assignment

When you click "View" on a subscription, the dialog will be expanded to include:

### A. Delivery History Calendar
- Fetch the last 30 days of `daily_orders` for that subscription
- Show a visual calendar grid where each date displays:
  - Green tick for `delivered` status
  - Red X for `pending` (past dates = missed) or failed statuses
  - Gray dot for future dates with scheduled orders
  - Empty for dates with no order (non-delivery days)

### B. Missed Delivery Compensation Action
- Clicking on a red X (missed delivery) date opens a compensation assignment flow:
  1. Select a new delivery date for the compensation order
  2. Select a delivery agent (reusing the existing agent selection UI from `AssignAgentModal`)
  3. Creates a `vacation_compensations` record with `reason = 'delivery_failed'`
  4. Creates a `daily_orders` entry for the compensation date

### C. Compensation Status on Subscription Card
- Show a red badge on subscription cards that have pending missed deliveries needing compensation
- Example: "2 Missed" badge in red next to the subscription status badges

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Subscriptions.tsx` | MODIFY | Add refresh button in header; add red "missed" badge per subscription |
| `src/components/CustomerDetailsDialog.tsx` | MODIFY | Expand into a full subscription detail view with calendar tab |
| `src/hooks/useSubscriptionDeliveryHistory.ts` | CREATE | Fetch daily_orders history for a subscription (last 30 days) |
| `src/hooks/useCreateCompensationOrder.ts` | CREATE | Mutation to create compensation record + daily_order for a missed delivery |
| `src/components/SubscriptionDeliveryCalendar.tsx` | CREATE | Calendar grid showing delivery status per date with click-to-compensate |
| `src/components/CompensationAssignmentDialog.tsx` | CREATE | Dialog to pick date + agent for a compensation delivery |

---

## UI Design

### Refresh Button (Header)
```text
+-----------------------------------------------------------+
|  Subscriptions                              [Refresh icon] |
|  Manage recurring customer deliveries                      |
+-----------------------------------------------------------+
```

### Subscription Card - Missed Badge
```text
[Active] [Agent Assigned] [2 Missed - red badge]
```

### Enhanced View Dialog - Tabs
```text
+---------------------------------------------------+
|  Customer Details                                  |
|  [Details]  [Delivery Calendar]                    |
+---------------------------------------------------+
|                                                    |
|  February 2026                                     |
|  Mo Tu We Th Fr Sa Su                              |
|   3  4  5  6  7  8  9                              |
|  [tick][tick][X][tick][X][tick][--]                  |
|  10 11 12 13 14 15                                 |
|  [tick][X][tick][tick][tick][--]                      |
|                                                    |
|  Legend: tick=Delivered  X=Missed  --=No delivery    |
|                                                    |
|  Click on X to assign compensation order           |
+---------------------------------------------------+
```

### Compensation Assignment (on clicking red X)
```text
+-------------------------------------------+
|  Assign Compensation for Feb 6 (Missed)   |
|                                           |
|  Customer: Ramesh                         |
|  Product: Cow Milk x1                     |
|                                           |
|  Select Compensation Date:                |
|  [Date Picker - future dates only]        |
|                                           |
|  Select Delivery Agent:                   |
|  [Agent list - same as AssignAgentModal]  |
|                                           |
|        [Cancel]  [Assign Compensation]    |
+-------------------------------------------+
```

---

## Technical Details

### useSubscriptionDeliveryHistory Hook
- Queries `daily_orders` where `subscription_id = X` and `date >= 30 days ago`
- Also queries `vacation_compensations` for the same subscription to identify dates that already have compensation assigned
- Returns a map of `date -> { status, hasCompensation, compensationStatus }`

### useCreateCompensationOrder Hook
- Inserts into `vacation_compensations` with:
  - `subscription_id`, `customer_id`, `product_id` from the subscription
  - `original_vacation_date` = the missed date
  - `compensation_delivery_date` = selected date
  - `assigned_agent_id` = selected agent
  - `reason` = 'delivery_failed' / 'technical_issue' / 'agent_not_delivered'
  - `status` = 'pending'
  - `seller_id` = current user
- Optionally creates a `daily_orders` entry for the compensation date
- Invalidates relevant queries

### Missed Count per Subscription
- Count `daily_orders` where `status = 'pending'` AND `date < today` for each subscription
- Subtract any that already have compensation in `vacation_compensations`
- Display as red badge on the subscription card

### Data Flow
1. Subscription page loads with `useSellerSubscriptions` (existing)
2. For missed count badges: a new query fetches missed counts grouped by subscription_id
3. On "View" click: dialog opens with two tabs (Details + Calendar)
4. Calendar tab fetches delivery history for that specific subscription
5. Clicking a missed date opens the compensation assignment dialog
6. After assigning, calendar refreshes to show the compensation status

