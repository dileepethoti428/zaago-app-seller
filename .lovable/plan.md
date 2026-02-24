
# Show Expired Subscriptions

## What Changes
Add an "Expired" status to the subscription cards and filter dropdown. A subscription is expired when its `end_date` is in the past (before today).

## Changes

### File: `src/pages/Subscriptions.tsx`

**1. Add expired count to `subscriptionCounts` (lines 174-229)**
- Add an `expired` counter initialized to 0
- In the `forEach` loop, check if `sub.end_date` exists and `new Date(sub.end_date) < today` -- if so, increment `expired`
- Return `expired` in the counts object

**2. Update status filter logic (lines 256-261)**
- Add: `else if (statusFilter === 'expired') matchesStatus = sub.end_date && new Date(sub.end_date) < new Date()`
- This filters to only show subscriptions whose plan has ended

**3. Add "Expired" option in the status filter dropdown (lines 437-442)**
- Add a new `SelectItem` with value `"expired"` showing the expired count:
  `<SelectItem value="expired">Expired ({subscriptionCounts.expired})</SelectItem>`

**4. Show an "Expired" badge on subscription cards (around lines 694-699)**
- After the plan duration badge, add a red/destructive badge when `end_date` is past today:
  ```
  if (isExpired) -> <Badge variant="destructive">Expired</Badge>
  ```

### No database or hook changes needed
The `end_date` field already exists on subscriptions and is already fetched.
