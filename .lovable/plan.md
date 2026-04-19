
The user wants "Today's Orders Summary" to only count **delivered** orders (not pending, cancelled, rejected, etc.) across totalOrders, totalItems, differentProducts, and itemBreakdown.

Looking at `src/hooks/useTodaysOrdersSummary.ts`:
- The `statusFilter` defaults to `'all'`, which maps to `[]` (no status filtering) → includes every order regardless of status.
- We need to restrict the query to only `status = 'delivered'`.

Looking at `src/components/TodaysOrdersSummary.tsx` (referenced via the hook) — it likely passes the statusFilter from a UI control. I should verify how the component invokes the hook to decide whether to:
- Option A: Change the default in the hook to only-delivered always (simplest, matches user request)
- Option B: Hardcode delivered in the query regardless of filter

Since the user explicitly says "it should show the delivered list", the intent is that this summary represents fulfilled/delivered orders only. The cleanest fix:

### Fix
In `src/hooks/useTodaysOrdersSummary.ts`:
- Always filter both the regular orders query and subscription orders query by `status = 'delivered'`, ignoring the `statusFilter` parameter (or remove its effect for non-delivered values).
- Specifically: replace the `mapStatusFilter` usage so that both `regularQuery` and `subQuery` always apply `.eq('status', 'delivered')`.

This guarantees totalOrders, totalItems, differentProducts, and itemBreakdown all reflect only delivered orders.

### Files changed
- `src/hooks/useTodaysOrdersSummary.ts` — force `status = 'delivered'` on both regular and subscription order queries.

### Expected result
"Today's Orders Summary" will only count orders that have been delivered. Pending, accepted, out_for_delivery, cancelled, and rejected orders will be excluded from all totals and the item breakdown.
