
## Root Cause

The sidebar "Orders" link goes to `/customer-orders` → `CustomerOrders.tsx`. This page calls `get_seller_specific_orders` RPC **without any `.range()` limit** — all 500+ orders are loaded at once. There is no "View More" / pagination at all on this page.

This is **different** from `Orders.tsx` (`/orders`) which already has server-side pagination from the previous fix.

---

## Fix Plan for `src/pages/CustomerOrders.tsx`

### 1. Add server-side pagination constants & state
```ts
const PAGE_SIZE = 10;
const [offset, setOffset] = useState(0);
const [hasMore, setHasMore] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);
```

### 2. Update `fetchOrders` to use `.range()`
```ts
const { data, error } = await supabase
  .rpc('get_seller_specific_orders', { p_seller_user_id: user.id })
  .range(fromOffset, fromOffset + PAGE_SIZE - 1);
```
- If `reset=true` (initial load / filter change): replace `orders` state
- If `reset=false` (load more): append to existing `orders`
- Set `hasMore = data.length === PAGE_SIZE`

### 3. Reset pagination when filters change
Add a `useEffect` watching `statusFilter`, `dateFilter`, `amountFilter`, `sortBy`, `searchTerm` that calls `fetchOrders(0, true)` so the list resets to the first page whenever filters change.

### 4. Add "Load More" button after the orders list (line 711)
```tsx
{hasMore && (
  <Button onClick={() => fetchOrders(offset, false)} disabled={loadingMore}>
    {loadingMore ? 'Loading...' : `Load More Orders`}
  </Button>
)}
<p className="text-center text-sm text-muted-foreground">
  Showing {filteredOrders.length} orders
</p>
```

### 5. Remove client-side filter/sort on all 500 orders
The current `filteredOrders` computed variable does client-side filtering on all loaded orders. This still works correctly — it filters the **currently loaded batch**. The `.range()` pagination reduces what's loaded; filters still apply on top of the loaded set. This is acceptable since filters are UI-level.

---

## Files Changed
- `src/pages/CustomerOrders.tsx` — add `.range()` pagination to `fetchOrders`, add `offset`/`hasMore`/`loadingMore` state, add "Load More Orders" button, reset on filter changes
