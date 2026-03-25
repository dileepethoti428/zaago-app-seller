
## Understanding

Two places need "View More" / pagination:

1. **Dashboard.tsx** — "Recent Orders" card already slices to 5 (`ordersData.slice(0, 5)`). Need to add a "View All Orders" link/button at the bottom of that card.

2. **Orders.tsx (Orders Management page)** — Currently renders ALL `filteredOrders` at once. Need to show only 5 initially, with a "View More" button that loads 5 more each time it's clicked (or shows all).

---

## Plan

### 1. `src/pages/Dashboard.tsx` — Add "View All Orders" link
- After the `recentOrders.map(...)` list (line ~415), add a "View All Orders" `<Link to="/orders">` button at the bottom of the Recent Orders card.
- Already limited to 5 items at line 101, so no data change needed.

### 2. `src/pages/Orders.tsx` — Add "View More" pagination
- Add a `visibleCount` state initialized to `5`.
- Slice `filteredOrders` to `filteredOrders.slice(0, visibleCount)` in the render (line 383).
- After the orders list, show a "View More" button if `visibleCount < filteredOrders.length`, clicking it adds 5 more (`setVisibleCount(prev => prev + 5)`).
- Also reset `visibleCount` to `5` whenever `activeTab` or `searchTerm` changes (in the existing `filterOrders` useEffect or a separate one).
- Show a count like "Showing 5 of 158 orders" for clarity.

## Files Changed
- `src/pages/Dashboard.tsx` — add "View All Orders" button in Recent Orders card
- `src/pages/Orders.tsx` — add `visibleCount` state + slice + "View More" button + reset on filter change
