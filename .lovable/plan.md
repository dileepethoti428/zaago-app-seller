

# Add Handover Confirmation for Subscription Deliveries

## Overview

Add a confirmation feature to mark when products have been handed over to a delivery agent. This helps sellers track which agents have already collected their products for the day.

---

## Solution Approach

We will track handover confirmations **per agent per date** rather than per individual order. This makes sense because:
- The seller hands over products to each agent once per session
- After handover, all orders for that agent on that date are considered handed over
- This prevents needing to confirm each order individually

---

## Database Changes

### New Table: `agent_handover_confirmations`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| seller_id | UUID | The seller confirming handover |
| agent_id | UUID | The delivery agent receiving products |
| handover_date | DATE | The delivery date (Today/Tomorrow) |
| confirmed_at | TIMESTAMP | When the handover was confirmed |
| created_at | TIMESTAMP | Record creation time |

**Unique constraint**: One confirmation per (seller_id, agent_id, handover_date) combination.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/xxx_handover_confirmations.sql` | CREATE | New table + RLS policies |
| `src/hooks/useHandoverConfirmation.ts` | CREATE | Hook to manage confirmation state and mutations |
| `src/hooks/useSubscriptionHandover.ts` | MODIFY | Include confirmation status in returned data |
| `src/components/SubscriptionHandoverCard.tsx` | MODIFY | Add confirm button and visual feedback |

---

## UI/UX Design

### Agent Card - Pending Confirmation
```text
+--------------------------------------------------+
| [Avatar] Ramesh                    [3 orders]    |
|          📞 9876543210                           |
|                                                  |
|   - Cow Milk         12 packets                  |
|   - Buffalo Milk      8 packets                  |
|                                                  |
|   [✓ Confirm Handover]                           |
+--------------------------------------------------+
```

### Agent Card - After Confirmation
```text
+--------------------------------------------------+
| [Avatar] Ramesh                    [3 orders] ✓  |
|          📞 9876543210                           |
|          Handed over at 6:45 AM                  |
|                                                  |
|   - Cow Milk         12 packets                  |
|   - Buffalo Milk      8 packets                  |
|                                                  |
|   [Undo Confirmation]                            |
+--------------------------------------------------+
```

### Confirmation Dialog

When the seller clicks "Confirm Handover", show an AlertDialog:

```text
+------------------------------------------+
|  Confirm Product Handover?               |
|                                          |
|  You are confirming that the following   |
|  products have been handed over to       |
|  Ramesh for today's deliveries:          |
|                                          |
|  • Cow Milk: 12 packets                  |
|  • Buffalo Milk: 8 packets               |
|                                          |
|  Total: 3 orders                         |
|                                          |
|           [Cancel]  [Confirm Handover]   |
+------------------------------------------+
```

---

## Implementation Details

### 1. Database Migration

```sql
-- Create handover confirmations table
CREATE TABLE public.agent_handover_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES delivery_agents(agent_id),
  handover_date DATE NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, agent_id, handover_date)
);

-- Enable RLS
ALTER TABLE public.agent_handover_confirmations ENABLE ROW LEVEL SECURITY;

-- Policies: Sellers can manage their own confirmations
CREATE POLICY "Sellers can view own handover confirmations"
  ON agent_handover_confirmations FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert own handover confirmations"  
  ON agent_handover_confirmations FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own handover confirmations"
  ON agent_handover_confirmations FOR DELETE
  USING (auth.uid() = seller_id);
```

### 2. New Hook: useHandoverConfirmation

The hook will:
- Fetch existing confirmations for the seller + date
- Provide `confirmHandover(agentId)` mutation
- Provide `undoConfirmation(agentId)` mutation
- Return a Map of agentId to confirmation timestamp

### 3. Update useSubscriptionHandover

Modify the existing RPC or create a joined query to include:
- Whether each agent has been confirmed
- The confirmation timestamp if confirmed

### 4. Update SubscriptionHandoverCard

Add to each AgentCard:
- "Confirm Handover" button (when not confirmed)
- Green checkmark + timestamp (when confirmed)
- "Undo" option to remove confirmation
- AlertDialog for confirmation prompt

---

## Summary Badges Update

Add a third badge showing confirmation progress:

```text
[👤 3 Agents] [📦 12 Orders] [✓ 1/3 Confirmed]
```

---

## Behavior Notes

- Confirmations are specific to a seller + agent + date
- "Today" and "Tomorrow" have separate confirmations
- Real-time updates via Supabase channels will sync confirmations
- Undo is available in case of mistakes
- Confirmation status is purely for seller tracking - it does not affect order status or delivery agent workflow

