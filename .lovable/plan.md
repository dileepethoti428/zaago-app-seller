

## Add "View More" pagination to Agent COD orders

### Root cause
In `AgentCodDetailDialog.tsx`, the orders list renders all orders at once via `orders.map(...)`. No pagination is applied.

### Fix
Apply the same client-side "View More" pattern already used on the COD Settlements list page (initial 5, +5 per click, with View Less when fully expanded).

In `src/components/AgentCodDetailDialog.tsx`:
1. Add `visibleCount` state (default 5).
2. Reset `visibleCount` to 5 when the sheet opens, when `agentId` changes, or when `period`/`statusFilter` change (via `useEffect`).
3. Render `orders.slice(0, visibleCount)` instead of `orders`.
4. Below the list, show:
   - "View More (N remaining)" button when `orders.length > visibleCount`
   - "View Less" button when expanded beyond 5 and all are visible

### Files changed
- `src/components/AgentCodDetailDialog.tsx`

