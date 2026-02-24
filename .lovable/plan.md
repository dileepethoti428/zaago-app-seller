

# Show Delivery Schedule, Time Slot, and Plan on Subscription Cards

## What Changes
Each subscription card will display three clearly labeled info badges/tags instead of the current single-line text:

1. **Delivery Schedule** -- Everyday, Alternative, Weekend, or Custom (with days listed)
2. **Delivery Time** -- Human-readable labels like "Early Morning", "Late Morning", "Evening" etc.
3. **Plan Duration** -- Calculated from start and end dates (e.g., "1 Week", "1 Month", "6 Months")

## Current State
Line 648-654 in `Subscriptions.tsx` shows:
```
Everyday • morning-early
```
This is hard to read and hides the plan duration entirely.

## New Display
Replace that single line with three styled badges:

```
[Calendar icon] Everyday    [Clock icon] Early Morning    [Tag icon] 1 Month Plan
[Calendar icon] Alternative [Clock icon] Late Evening     [Tag icon] 6 Months Plan  
[Calendar icon] Custom (Sat, Sun) [Clock icon] Morning   [Tag icon] 1 Week Plan
```

## Technical Details

### File: `src/pages/Subscriptions.tsx`

**1. Add a helper function** to format delivery time slots into readable labels:
- `morning-early` -> "Early Morning"
- `morning` -> "Morning"  
- `morning-late` -> "Late Morning"
- `evening-early` -> "Early Evening"
- `evening-late` -> "Late Evening"

**2. Add a helper function** to compute plan duration from `start_date` and `end_date`:
- Difference <= 7 days -> "1 Week"
- Difference <= 14 days -> "2 Weeks"
- Difference <= 31 days -> "1 Month"
- Difference <= 93 days -> "3 Months"
- Difference <= 186 days -> "6 Months"
- Difference <= 366 days -> "1 Year"
- Otherwise show exact month count

**3. Add a helper function** to format schedule type:
- `everyday` -> "Everyday"
- `alternative` -> "Alternate Days"
- `weekend` -> "Weekends"
- `custom` -> "Custom" + show delivery_days if available (e.g., "Custom (Sat, Sun)")

**4. Replace lines 648-655** (the current single-line display) with three badge rows showing schedule, time, and plan duration using colored Badge components for visual clarity.

### No database changes needed
All required data (`subscription_type`, `delivery_time_slot`, `start_date`, `end_date`, `delivery_days`) already exists in the subscriptions table.

### Files to modify
- `src/pages/Subscriptions.tsx` (add helpers + update card display)
