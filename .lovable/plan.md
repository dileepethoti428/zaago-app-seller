
# Fix: Vacation Compensations Not Showing for Undelivered Orders

## Root Cause Analysis

After thorough investigation, I found **3 critical issues** preventing compensations from appearing:

### Issue 1: Database NOT NULL Constraints Blocking All Inserts

The `vacation_compensations` table has two columns that are `NOT NULL` but should be nullable:

| Column | Current | Problem |
|--------|---------|---------|
| `vacation_period_id` | NOT NULL | Non-vacation failures (technical error, agent issue) have no vacation period -- insert fails |
| `compensation_delivery_date` | NOT NULL | Delivery date is decided later by seller -- insert fails |

This means **both the database triggers AND the edge function silently fail** when trying to create compensation records. Every INSERT hits a NOT NULL violation and gets swallowed by the `EXCEPTION WHEN OTHERS` handler.

### Issue 2: Edge Function Only Scans for Explicit Failure Statuses

The `scan-missed-deliveries` function looks for daily_orders with statuses like `failed`, `undelivered`, `cancelled_agent`. But in your database:

- **All undelivered orders are stuck at `pending` status** (396 pending, 64 delivered)
- Orders from past dates (Feb 3-7) that were never delivered remain as `pending`
- The function never picks them up because `pending` is not in the scan list

### Issue 3: Edge Function Only Scans Yesterday

The function only checks yesterday's date, missing all the accumulated undelivered orders from previous days.

### Current State
- `vacation_compensations` table: **0 records** (empty)
- Past-due `pending` daily_orders: **30+ records** going back to Feb 3

---

## Solution

### Step 1: Database Migration -- Fix NOT NULL Constraints

Make `vacation_period_id` and `compensation_delivery_date` nullable so compensations can be created for all failure types:

```text
ALTER TABLE vacation_compensations
  ALTER COLUMN vacation_period_id DROP NOT NULL;

ALTER TABLE vacation_compensations
  ALTER COLUMN compensation_delivery_date DROP NOT NULL;
```

### Step 2: Update Edge Function -- Scan Stale Pending Orders

Modify `scan-missed-deliveries` to also detect daily_orders with status `pending` that are past their delivery date. Scan back up to 30 days instead of just yesterday.

Key changes:
- Add scan for `pending` daily_orders where `date < today`
- Mark these as `delivery_failed` reason (undelivered)
- Scan a configurable date range (default: last 30 days)
- Accept optional parameters from the UI (seller_id, date range)

### Step 3: Add "Scan for Missed Deliveries" Button to UI

Add a button on the Vacation Compensations page that:
- Calls the `scan-missed-deliveries` edge function
- Shows a loading state and results summary
- Auto-refreshes the compensation list after scan

### Step 4: Add Manual Compensation Creation

Add a "Create Compensation" button allowing sellers to manually create a compensation for any subscription, choosing the reason (technical issue, vacation, agent not delivered, etc.).

---

## Files to Change

| File | Action | Changes |
|------|--------|---------|
| Database migration | CREATE | Make `vacation_period_id` and `compensation_delivery_date` nullable |
| `supabase/functions/scan-missed-deliveries/index.ts` | MODIFY | Add stale pending order scanning, multi-day scan, seller_id filter |
| `src/hooks/useAllVacationData.ts` | MODIFY | Add `scanForMissedDeliveries` function, refresh after scan |
| `src/pages/VacationCompensations.tsx` | MODIFY | Add scan button, manual compensation creation, improved empty state |

---

## Updated UI Flow

### Header with Scan Button
```text
+-----------------------------------------------------------+
|  Vacation Compensations                                    |
|  [Scan for Missed Deliveries]  [+ Create Compensation]    |
+-----------------------------------------------------------+
```

### After Scanning
```text
+-----------------------------------------------------------+
|  Scan Complete!                                            |
|  Found 28 undelivered orders. Created 28 compensations.   |
+-----------------------------------------------------------+
|                                                            |
|  [Summary Cards: Vacations | Failed | Pending | ...]      |
|                                                            |
|  [Compensation Cards with actions...]                     |
+-----------------------------------------------------------+
```

---

## Technical Details

### Edge Function Update

The updated `scan-missed-deliveries` will:
1. Accept optional `seller_id` and `days_back` parameters
2. Scan daily_orders where `status = 'pending' AND date < CURRENT_DATE`
3. Also scan for explicit failure statuses (existing behavior)
4. Skip orders that already have compensation records
5. Handle the now-nullable `vacation_period_id` and `compensation_delivery_date`

### Unique Constraint Consideration

The existing unique constraint `UNIQUE (subscription_id, original_vacation_date)` will prevent duplicate compensations per subscription per date, which is the desired behavior.
