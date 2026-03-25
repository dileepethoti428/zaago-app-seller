
## Root Cause

The `fetchOrders()` function calls `supabase.rpc('get_seller_specific_orders', ...)` which returns **all 500+ orders** in a single shot. The front-end `visibleCount` slicing only controls rendering — all data is already fetched. This causes:
- Slow page load (500+ rows transferred over the network)
- High memory usage
- UI lag

The `View More` button works but pagination needs to happen at the **data fetch level**, not just rendering level.

## Fix Strategy: Server-side Pagination

Use Supabase's built-in `range()` pagination on the RPC call, OR fall back to fetching in pages of 10 with an offset. Since we're calling an RPC, the cleanest approach without modifying the DB function is:

**Sort + limit at DB level using a wrapper query** — but since `rpc()` doesn't support `.range()` on custom functions easily, the best approach is:

1. **Sort orders by `created_at DESC` so newest appear first** (already done client-side)
2. **Add `offset` + `limit` parameters to the fetch** using Supabase `.range(from, to)` on the RPC result
3. **Track `currentPage` or `offset` state** — "View More" fetches the next batch and appends

### Implementation

**`src/pages/Orders.tsx` changes:**

- Remove `setOrders(mappedOrders)` (replace all at once)  
- Add `offset` state starting at `0`, page size constant `PAGE_SIZE = 10`
- Add `hasMore` state (true if last fetch returned PAGE_SIZE results)
- `fetchOrders(offset=0)`: fetches with `.range(offset, offset + PAGE_SIZE - 1)` on rpc, sets orders, sets hasMore
- `loadMore()`: calls `fetchOrders(currentOffset + PAGE_SIZE)` and **appends** to existing orders
- Remove `visibleCount` state entirely (no longer needed — pagination is server-side)
- Replace `filteredOrders.slice(0, visibleCount).map(...)` with just `filteredOrders.map(...)`
- Replace View More / View Less block with a single "Load More Orders" button that calls `loadMore()`, shown only when `hasMore === true`
- When `activeTab` or `searchTerm` changes: reset offset to 0, clear orders, re-fetch from start
- Show "Showing X orders" label (count of currently loaded orders)

### Key benefit
- Initial load: only 10 orders transferred
- Each "View More" click: 10 more orders appended
- 500+ orders never all loaded at once

## Files Changed
- `src/pages/Orders.tsx` — replace client-side slice with server-side paginated fetch using `.range()`, add `offset` + `hasMore` state, update View More to load next page
