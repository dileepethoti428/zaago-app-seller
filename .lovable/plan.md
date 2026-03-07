

# Agent Detail View for COD Settlements

## What We're Building
When clicking on a delivery partner card on the COD Settlements page, a detail view opens showing all individual COD orders for that agent. Each order shows order ID, amount, status (pending/settled), and date. Sellers can settle individual orders one at a time instead of bulk-settling all at once.

## Implementation

### 1. New Hook: `useAgentCodOrders`
- Fetches individual `cod_settlements` rows for a specific `agent_id` + `seller_id`
- Joins with `orders` table to get order number/details
- Supports the same period/status filters from the parent page
- Includes a mutation to settle a single settlement by `id`

### 2. New Component: `AgentCodDetailDialog`
- A dialog/sheet that opens when clicking an agent card
- Shows agent name/avatar at the top
- Lists individual COD orders with:
  - Order ID (shortened)
  - Amount (₹)
  - Status badge (pending = orange, settled = green)
  - Date
  - "Settle" button per pending order
- Summary at the top: total pending amount, total settled

### 3. Update `CodSettlements.tsx`
- Add state for selected agent (`selectedAgentId`)
- Make agent cards clickable (wrap in `onClick`)
- Render the detail dialog when an agent is selected

### Files Changed
- **`src/hooks/useAgentCodOrders.ts`** — new hook for individual order settlements
- **`src/components/AgentCodDetailDialog.tsx`** — new detail dialog component
- **`src/pages/CodSettlements.tsx`** — add click handler and dialog integration

No database changes needed — the existing `cod_settlements` table already has all required fields and the RLS policies are in place.

