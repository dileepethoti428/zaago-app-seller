
## Issues Found & Fixes Needed

### 1. Orders Page — View More not visible
The condition at line 551 is `filteredOrders.length > 5` (strict greater-than). If there are exactly 5 orders, no button shows. More importantly, the button only shows when `filteredOrders.length > 5` AND the user might have fewer. Also the "Showing X of Y" counter and View More section is there but may not be scrolled to. The logic is correct — but needs the condition changed to `>= 5` so it always shows if there are 5+ items, AND the `visibleCount` initial should stay 5.

Actually re-reading: `filteredOrders.length > 5` means you need MORE than 5 orders to see the button. Change to `filteredOrders.length > visibleCount` — so the button appears whenever there are more items than currently shown, regardless of exact count.

### 2. Subscriptions Page — No View More at all
Currently renders all `filteredSubscriptions` directly (line 492). Need to add `visibleCount` state + slice + View More/Less button + reset on filter changes.

### 3. Products Page — No View More at all  
Currently renders all `filteredProducts` directly (line 553). Need to add `visibleCount` state + slice + View More/Less button + reset on filter/search changes.

### 4. COD Settlements Page — No View More at all
Currently renders all `agents` directly (line 97). Need to add `visibleCount` state + slice + View More/Less button. Reset when period/statusFilter/search changes.

---

## Plan

### Fix 1 — `src/pages/Orders.tsx`
- Change line 551 condition from `filteredOrders.length > 5` to `filteredOrders.length > visibleCount` so the button correctly appears whenever there are unseen items (logic is already there, just the wrong condition).

### Fix 2 — `src/pages/Subscriptions.tsx`
- Add `visibleCount` state initialized to `5`
- Add `useEffect` to reset `visibleCount` to `5` when `searchTerm`, `statusFilter`, `deliveryTypeFilter`, or `agentFilter` changes
- Change line 492 `filteredSubscriptions.map(...)` to `filteredSubscriptions.slice(0, visibleCount).map(...)`
- After the grid, add "Showing X of Y" label + View More / View Less buttons (same pattern as Orders page)

### Fix 3 — `src/pages/Products.tsx`
- Add `visibleCount` state initialized to `5`  
- Update the `useEffect` at line 73 to also call `setVisibleCount(5)` when filters change
- Change line 553 `filteredProducts.map(...)` to `filteredProducts.slice(0, visibleCount).map(...)`
- After the grid, add "Showing X of Y" label + View More / View Less buttons

### Fix 4 — `src/pages/CodSettlements.tsx`
- Add `visibleCount` state initialized to `5`
- Add `useEffect` that resets `visibleCount` to `5` when `period`, `statusFilter`, or `search` changes
- Change line 97 `agents.map(...)` to `agents.slice(0, visibleCount).map(...)`
- After the list, add "Showing X of Y" label + View More / View Less buttons

## Files Changed
- `src/pages/Orders.tsx` — fix View More condition
- `src/pages/Subscriptions.tsx` — add visibleCount + View More
- `src/pages/Products.tsx` — add visibleCount + View More
- `src/pages/CodSettlements.tsx` — add visibleCount + View More
