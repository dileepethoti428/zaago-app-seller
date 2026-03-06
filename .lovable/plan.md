

# COD Settlements Feature

## Overview
Build a new "COD Settlements" page where sellers can track cash collected by delivery partners on COD orders and confirm whether the delivery partner has handed over the money.

## Database Changes

### New table: `cod_settlements`
```sql
CREATE TABLE cod_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  agent_id UUID NOT NULL REFERENCES delivery_agents(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'disputed')),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE cod_settlements ENABLE ROW LEVEL SECURITY;

-- Sellers can view/update their own settlements
CREATE POLICY "Sellers can view own settlements"
  ON cod_settlements FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can update own settlements"
  ON cod_settlements FOR UPDATE TO authenticated
  USING (seller_id = auth.uid());
```

### Auto-create settlement records
Create a database trigger on the `orders` table: when an order with `payment_method = 'COD'` is marked as `delivered`, automatically insert a row into `cod_settlements` with status `pending`.

## Frontend Changes

### 1. New page: `src/pages/CodSettlements.tsx`
Based on the screenshot reference:
- Page title: "COD Settlements" with subtitle
- Search bar to filter by delivery partner name
- Status filter dropdown (All Status / Pending / Settled)
- Time period filter chips (All Time, Today, 1 Week, 1 Month, 6 Months)
- Card per delivery partner showing:
  - Partner name and avatar
  - Number of COD deliveries
  - Total amount (in rupees)
  - Pending count badge
  - "Settle" button (trash icon in screenshot, but we'll use a checkmark/settle action)
- Clicking settle marks all pending settlements for that agent as `settled`

### 2. New hook: `src/hooks/useCodSettlements.ts`
- Query `cod_settlements` joined with `delivery_agents` and `orders`
- Group by agent, sum amounts, count pending
- Filter by date range and status
- Mutation to mark settlements as settled

### 3. Sidebar update: `src/components/Sidebar.tsx`
- Add "COD Settlements" link with `DollarSign` icon after "Sales Report"

### 4. Router update: `src/App.tsx`
- Add route `/cod-settlements` pointing to the new page

## Technical Details
- The settlement records are auto-created via DB trigger when COD orders are delivered
- Seller confirms money received by clicking "Mark as Settled" which updates status to `settled` and sets `settled_at`
- All queries filtered by `seller_id = auth.uid()` via RLS
- Time filters use `created_at` on the settlement record

