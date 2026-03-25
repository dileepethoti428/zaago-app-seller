
## 3 Bugs to Fix

### Bug 1 — "View All Orders" not visible on the seller home/Index page
The "View All Orders" link exists in `Dashboard.tsx` (line 418) but the user is looking at `src/pages/Index.tsx` — the seller home page that shows "Regular Orders Overview". That page has no "View All Orders" link after the recent orders summary. Fix: add a "View All Orders" link to Index.tsx's Regular Orders Overview card.

### Bug 2 — "View X Order - Accept Now" button works but shows wrong orders
The button navigates to `/orders?filter=to_accept` which is correct. But on arrival, there's a **stale closure bug**:
- `[user]` useEffect fires first → calls `fetchOrders(0, true)` → `applyFilters()` uses `activeTab = 'all'` (initial state) → shows all orders
- `[searchParams]` useEffect fires → sets `activeTab = 'to_accept'`  
- `[activeTab]` useEffect fires → re-fetches, but `applyFilters` inside `fetchOrders` is a closure still capturing `activeTab` asynchronously

Fix: change `applyFilters` to accept `tab` and `search` as explicit parameters instead of reading from closed-over state, and pass the correct values when calling from `fetchOrders`.

### Bug 3 — "To Accept" filter shows delivered orders
Same root cause as Bug 2. The `applyFilters()` function (line 179) reads `activeTab` and `searchTerm` from the outer closure, but when called inside `fetchOrders`, these values may be stale (React state updates are async). So when `fetchOrders` is called from the `[activeTab]` effect, `applyFilters` might still see the old `activeTab` value.

Fix: make `applyFilters(orderList, tab, search)` take explicit params, and pass the correct `tab` value when calling it from within `fetchOrders`.

---

## Plan

### Fix `src/pages/Orders.tsx`

1. Change `applyFilters(orderList)` signature to `applyFilters(orderList, tab = activeTab, search = searchTerm)` — uses params instead of closed-over state values.

2. In `fetchOrders(fromOffset, reset)`, pass the current `activeTab` explicitly when calling `applyFilters`:
   ```ts
   setFilteredOrders(applyFilters(mappedOrders, activeTab, searchTerm));
   // and in append case:
   setFilteredOrders(applyFilters(updated, activeTab, searchTerm));
   ```

3. The `[activeTab]` useEffect already calls `fetchOrders(0, true)` — but since `activeTab` state has been updated before this effect runs, passing `activeTab` directly into the refactored `applyFilters` will now work correctly.

4. Also ensure the `[searchTerm, activeTab]` useEffect passes values explicitly:
   ```ts
   setFilteredOrders(applyFilters(orders, activeTab, searchTerm));
   ```

### Fix `src/pages/Index.tsx`
Add a "View All Orders →" link at the bottom of the Regular Orders Overview card (after the stats grid, around line 249), linking to `/orders`.

## Files Changed
- `src/pages/Orders.tsx` — fix stale closure in `applyFilters` by passing `tab` and `search` as explicit params
- `src/pages/Index.tsx` — add "View All Orders →" link at the bottom of the Regular Orders Overview card
