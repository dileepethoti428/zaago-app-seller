

# Fix Horizontal Scrolling for Card/Filter Sections

## Problem
On mobile and smaller screens, stat card rows and filter sections either wrap awkwardly or get cut off. The user wants these sections to be horizontally scrollable instead.

## Changes

### 1. DeliveryAgents.tsx - Stats Cards Row (line 146)
Change the 5 stats cards from a wrapping grid to a horizontally scrollable flex row:
- Wrap the grid in a `div` with `overflow-x-auto` and `-mx-4 px-4` for edge-to-edge scrolling
- Change `grid grid-cols-2 sm:grid-cols-5` to `flex gap-4` with `min-w-[200px]` on each card so they scroll on mobile but fit on desktop

### 2. DeliveryAgents.tsx - Table (line 234)
Already has `overflow-x-auto` -- no change needed.

### 3. UnassignedOrders.tsx - Summary Cards (line 209)
Wrap the 3 summary cards in a horizontally scrollable container:
- Add `overflow-x-auto` wrapper
- Change grid to flex with minimum widths on cards

### 4. UnassignedOrders.tsx - Tabs (line 179)
Wrap `TabsList` in `overflow-x-auto` so tabs scroll on small screens.

### 5. Subscriptions.tsx - Filter Row (line 385)
Make the filter dropdowns row horizontally scrollable on mobile:
- Add `overflow-x-auto` and `flex-nowrap` so filters scroll instead of stacking

### 6. Products.tsx - Stats Cards (line 441)
Wrap the 4 stats cards in a horizontally scrollable container:
- Add `overflow-x-auto` wrapper
- Change grid to flex with minimum widths

## Technical Details

Each section will follow this pattern:
```text
<div className="overflow-x-auto -mx-3 px-3">
  <div className="flex gap-4 min-w-max">
    <Card className="min-w-[180px] flex-1">...</Card>
    ...
  </div>
</div>
```

The `-mx-3 px-3` ensures the scrollable area extends to the edges for a natural swipe feel. `min-w-max` prevents the flex container from shrinking.

### Files to modify
- `src/pages/DeliveryAgents.tsx` (stats cards)
- `src/pages/UnassignedOrders.tsx` (summary cards + tabs)
- `src/pages/Subscriptions.tsx` (filter row)
- `src/pages/Products.tsx` (stats cards)
