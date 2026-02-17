

# Implementation Plan: 6 Feature Requests

## 1. Deactivate Seller Account from Admin Dashboard

**What it does**: Admin can deactivate a seller. Deactivated sellers see an "Account Deactivated" screen and cannot use the app until reactivated.

**Database Change**:
- Add `is_deactivated BOOLEAN DEFAULT false` column to the `sellers` table

**Code Changes**:

| File | Action | Details |
|------|--------|---------|
| `src/pages/SellerApprovals.tsx` | MODIFY | Add a "Deactivate/Activate" toggle button for each approved seller |
| `src/pages/Login.tsx` | MODIFY | After successful login, check `sellers.is_deactivated`. If true, sign the user out and show "Account Deactivated" toast |
| `src/components/ProtectedRoute.tsx` | MODIFY | Add a check for `is_deactivated` in `checkBankDetailsAndRedirect`. If true, redirect to a new `/account-deactivated` page |
| `src/pages/AccountDeactivated.tsx` | CREATE | Simple page showing "Your account has been deactivated. Contact admin for reactivation." with a logout button |
| `src/App.tsx` | MODIFY | Add route for `/account-deactivated` |

---

## 2. Subscription Revenue: One-Time on Creation (Not Daily Projected)

**What it does**: When a subscription is created successfully, the total subscription amount is added once to the seller's revenue, instead of projecting daily amounts.

**Database/RPC Change**:
- Modify the `get_seller_stats_with_period` RPC function to calculate subscription revenue as a one-time sum from successfully created subscriptions (based on `subscriptions.created_at` within the period), rather than projecting daily amounts
- The formula: `SUM(subscription.quantity * product.price)` for subscriptions created in the selected period

**Code Changes**:

| File | Action | Details |
|------|--------|---------|
| Database RPC | MODIFY | Update `get_seller_stats_with_period` to use subscription creation date for revenue, remove `projected_daily_subscription` |
| `src/pages/Dashboard.tsx` | MODIFY | Remove "Projected Daily Sub." card from revenue breakdown, update labels |

---

## 3. Seller Sold Items Report with Date Filters and PDF Export

**What it does**: A new "Sales Report" page where sellers can view sold items filtered by date range (1 day, today, 1 week, 15 days, 1 month, 6 months, all time, or custom calendar range), with detailed info and PDF download.

**Code Changes**:

| File | Action | Details |
|------|--------|---------|
| `src/pages/SalesReport.tsx` | CREATE | Full page with date filter buttons, calendar date picker, table showing product name, quantity, price, customer name, sale date, order ID |
| `src/hooks/useSalesReport.ts` | CREATE | Hook to query `orders` + `order_items` (or `daily_orders`) filtered by seller and date range, returning detailed sold items |
| `src/utils/salesReportExport.ts` | CREATE | PDF export using jsPDF (already installed) with seller name, date range, itemized table, totals |
| `src/App.tsx` | MODIFY | Add route `/sales-report` |
| `src/components/Sidebar.tsx` | MODIFY | Add "Sales Report" link in navigation |

**Report columns**: Date, Order ID, Customer Name, Product Name, Quantity, Unit Price, Total, Status

---

## 4. Compensation Details on Subscription Page

**What it does**: When a seller clicks on a compensation date, it shows full product details and agent name. If compensation is due today, the subscription page prominently shows what items need to be handed over and to whom.

**Code Changes**:

| File | Action | Details |
|------|--------|---------|
| `src/hooks/useTodayCompensations.ts` | CREATE | Hook to fetch `vacation_compensations` where `compensation_delivery_date = today` and `status = 'pending'`, joined with product and agent info |
| `src/components/TodayCompensationBanner.tsx` | CREATE | A prominent banner/card at the top of subscriptions page showing "Today's Compensation Handovers" with item name, quantity, and agent name for each |
| `src/pages/Subscriptions.tsx` | MODIFY | Add the TodayCompensationBanner at the top of the page |
| `src/components/SubscriptionDeliveryCalendar.tsx` | MODIFY | When clicking a compensation date (blue check), show a detail popup with product name, quantity, agent name, compensation status, original missed date |
| `src/components/CompensationDetailDialog.tsx` | CREATE | Dialog showing full compensation details when clicking on a compensation date |

**Today's banner design**:
```text
+----------------------------------------------------------+
| Today's Compensation Handovers                           |
|                                                          |
| Cow Milk x2 --> Hand over to: Raju (Agent)              |
| Curd x1    --> Hand over to: Suresh (Agent)             |
+----------------------------------------------------------+
```

---

## 5. Fix Category Creation for Different Sellers with Same Name

**What it does**: Currently there's a UNIQUE constraint on `categories.name` that prevents different sellers from creating categories with the same name (e.g., two milk sellers both wanting a "Dairy" category). This needs to be changed to allow same names across sellers.

**Database Change**:
- Drop the existing `categories_name_key` unique constraint on `name`
- Add a new composite unique constraint on `(name, seller_id)` so each seller can have unique category names within their own scope

**No frontend code changes needed** -- the existing code already filters by `seller_id`. This is purely a database fix.

---

## 6. Remove Developer Tools from Settings Page

**What it does**: Remove the "Developer Tools" card (containing `TestOrderNotification`) from the settings page.

**Code Changes**:

| File | Action | Details |
|------|--------|---------|
| `src/pages/Settings.tsx` | MODIFY | Remove lines 850-861 (the Developer Tools card with `TestOrderNotification`) |

---

## Implementation Order

1. Feature 6 (Remove dev tools) -- simplest, single file delete
2. Feature 5 (Fix categories) -- database migration only
3. Feature 1 (Deactivate seller) -- database + new page + login check
4. Feature 2 (Subscription revenue) -- RPC modification + dashboard update
5. Feature 4 (Compensation details) -- new components + subscriptions page update
6. Feature 3 (Sales report) -- new page, hook, PDF export

