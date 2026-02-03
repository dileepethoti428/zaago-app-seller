

# Vacation Compensation Backend + Logic Implementation Plan

## Current State Analysis

### Existing Implementation
The current vacation compensation system has:
1. **`vacation_compensations` table** with columns: `id`, `subscription_id`, `vacation_period_id`, `original_vacation_date`, `compensation_delivery_date`, `seller_id`, `assigned_agent_id`, `status` (pending/assigned/delivered/cancelled)
2. **Frontend hooks**: `useVacationCompensations.ts` and `useAllVacationData.ts` for fetching and displaying vacation data
3. **UI page**: `VacationCompensations.tsx` showing pending, assigned, and delivered compensations
4. **Manual creation flow**: `VacationCompensationModal.tsx` for sellers to manually schedule extra deliveries

### Gap Analysis
The current system is **manual only** - sellers must create compensation records themselves. Your request requires **automatic compensation creation** when:
- Orders fail delivery (delivery_failed, undelivered, technical_error, agent_unavailable)
- Agent marks order as "not delivered"
- System/seller-side failures occur

---

## Implementation Plan

### Phase 1: Database Schema Enhancements

#### 1.1 Extend `vacation_compensations` table
Add new columns to support broader compensation scenarios:

```sql
ALTER TABLE vacation_compensations ADD COLUMN IF NOT EXISTS
  order_id UUID REFERENCES orders(id),           -- Link to original failed order
  customer_id UUID REFERENCES customers(id),     -- Direct customer link
  product_id UUID REFERENCES products(id),       -- Product that was missed
  quantity INTEGER DEFAULT 1,                    -- Quantity missed
  reason TEXT DEFAULT 'vacation',                -- vacation | technical_error | delivery_failed | agent_issue | seller_failure
  compensation_type TEXT DEFAULT 'extra_delivery', -- extra_delivery | refund | credit
  notes TEXT,                                    -- Optional notes
  delivery_failed_at TIMESTAMPTZ,               -- When the failure occurred
  delivered_at TIMESTAMPTZ,                      -- When compensation was delivered
  cancelled_at TIMESTAMPTZ,                      -- When cancelled (if applicable)
  cancelled_reason TEXT;                         -- Reason for cancellation
```

#### 1.2 Create `compensation_logs` table
Track all actions on compensation records:

```sql
CREATE TABLE compensation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compensation_id UUID NOT NULL REFERENCES vacation_compensations(id),
  action TEXT NOT NULL,                          -- created | agent_assigned | delivered | cancelled | type_changed
  performed_by UUID,                             -- user who performed action
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 1.3 Add RLS Policies
```sql
-- Sellers can manage compensations for their products
CREATE POLICY "Sellers can manage their compensations"
ON vacation_compensations FOR ALL
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Sellers can view compensation logs for their compensations
CREATE POLICY "Sellers can view their compensation logs"
ON compensation_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vacation_compensations vc 
  WHERE vc.id = compensation_logs.compensation_id 
  AND vc.seller_id = auth.uid()
));
```

---

### Phase 2: Automatic Compensation Trigger

#### 2.1 Create Database Trigger Function
This function fires when order status changes to a failed state:

```sql
CREATE OR REPLACE FUNCTION create_compensation_on_delivery_failure()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription_id UUID;
  v_customer_id UUID;
  v_product_id UUID;
  v_seller_id UUID;
  v_quantity INTEGER;
  v_vacation_period_id UUID;
  v_is_vacation BOOLEAN := false;
  v_reason TEXT;
  v_existing_compensation UUID;
BEGIN
  -- Only trigger on status changes to failure states
  IF NEW.status NOT IN ('delivery_failed', 'undelivered', 'technical_error', 'agent_unavailable', 'not_delivered') THEN
    RETURN NEW;
  END IF;

  -- Skip if already successfully delivered
  IF OLD.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  -- Check if compensation already exists for this order
  SELECT id INTO v_existing_compensation
  FROM vacation_compensations
  WHERE order_id = NEW.id;

  IF v_existing_compensation IS NOT NULL THEN
    RETURN NEW; -- Avoid duplicate
  END IF;

  -- Get subscription and product info from order items
  -- Extract first item's product_id and seller_id
  v_product_id := (NEW.items->0->>'product_id')::UUID;
  v_seller_id := (NEW.items->0->>'seller_id')::UUID;
  v_quantity := COALESCE((NEW.items->0->>'quantity')::INTEGER, 1);
  v_subscription_id := NEW.subscription_id;

  -- Get customer_id from subscription or customers table
  IF v_subscription_id IS NOT NULL THEN
    SELECT customer_id INTO v_customer_id
    FROM subscriptions WHERE id = v_subscription_id;
  END IF;

  -- Check if delivery date falls within active vacation period
  IF v_subscription_id IS NOT NULL THEN
    SELECT id INTO v_vacation_period_id
    FROM subscription_vacation_periods
    WHERE subscription_id = v_subscription_id
      AND status = 'active'
      AND NEW.delivery_date BETWEEN start_date AND end_date;

    IF v_vacation_period_id IS NOT NULL THEN
      v_is_vacation := true;
      v_reason := 'vacation';
    END IF;
  END IF;

  -- Set reason based on failure type if not vacation
  IF NOT v_is_vacation THEN
    v_reason := CASE NEW.status
      WHEN 'delivery_failed' THEN 'delivery_failed'
      WHEN 'undelivered' THEN 'delivery_failed'
      WHEN 'not_delivered' THEN 'agent_issue'
      WHEN 'technical_error' THEN 'technical_error'
      WHEN 'agent_unavailable' THEN 'agent_issue'
      ELSE 'seller_failure'
    END;
  END IF;

  -- Create compensation record
  INSERT INTO vacation_compensations (
    subscription_id,
    vacation_period_id,
    order_id,
    customer_id,
    product_id,
    seller_id,
    original_vacation_date,
    compensation_delivery_date,
    quantity,
    reason,
    compensation_type,
    status,
    delivery_failed_at
  ) VALUES (
    v_subscription_id,
    v_vacation_period_id,
    NEW.id,
    v_customer_id,
    v_product_id,
    COALESCE(v_seller_id, NEW.seller_id),
    NEW.delivery_date,
    NULL, -- To be set by seller
    v_quantity,
    v_reason,
    'extra_delivery',
    'pending',
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.2 Create Trigger on Orders Table
```sql
CREATE TRIGGER trigger_create_compensation_on_failure
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION create_compensation_on_delivery_failure();
```

#### 2.3 Create Trigger for Daily Orders (Subscription)
Similar trigger for `daily_orders` table:

```sql
CREATE OR REPLACE FUNCTION create_compensation_for_daily_order_failure()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription RECORD;
  v_product RECORD;
  v_vacation_period_id UUID;
  v_is_vacation BOOLEAN := false;
  v_reason TEXT;
  v_existing UUID;
BEGIN
  -- Only on failed status
  IF NEW.status NOT IN ('failed', 'undelivered', 'cancelled_agent', 'not_delivered') THEN
    RETURN NEW;
  END IF;

  -- Skip if already delivered
  IF OLD.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  -- Check duplicate
  SELECT id INTO v_existing
  FROM vacation_compensations
  WHERE subscription_id = NEW.subscription_id
    AND original_vacation_date = NEW.date;

  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get subscription details
  SELECT * INTO v_subscription FROM subscriptions WHERE id = NEW.subscription_id;

  -- Get product details
  SELECT * INTO v_product FROM products WHERE id = v_subscription.product_id;

  -- Check vacation
  SELECT id INTO v_vacation_period_id
  FROM subscription_vacation_periods
  WHERE subscription_id = NEW.subscription_id
    AND status = 'active'
    AND NEW.date BETWEEN start_date AND end_date;

  v_is_vacation := v_vacation_period_id IS NOT NULL;
  v_reason := CASE WHEN v_is_vacation THEN 'vacation' ELSE 'delivery_failed' END;

  -- Insert compensation
  INSERT INTO vacation_compensations (
    subscription_id,
    vacation_period_id,
    customer_id,
    product_id,
    seller_id,
    original_vacation_date,
    quantity,
    reason,
    status
  ) VALUES (
    NEW.subscription_id,
    v_vacation_period_id,
    NEW.customer_id,
    v_subscription.product_id,
    v_product.seller_id,
    NEW.date,
    NEW.quantity,
    v_reason,
    'pending'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_daily_order_compensation
AFTER UPDATE ON daily_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION create_compensation_for_daily_order_failure();
```

---

### Phase 3: Edge Function - Daily Compensation Scanner

Create `supabase/functions/scan-missed-deliveries/index.ts` to run as a daily cron job:

```typescript
// Runs daily to catch any missed delivery compensation opportunities
// - Scans orders from previous day that weren't delivered
// - Creates compensation records if not already exists
// - Handles edge cases the trigger might miss
```

Key logic:
1. Query orders from yesterday with failed/undelivered status
2. Query daily_orders from yesterday with failed status
3. Check if compensation exists for each
4. Create compensation records for any missing ones
5. Log results to `cron_execution_logs`

---

### Phase 4: Frontend Enhancements

#### 4.1 Update `useVacationCompensations.ts`
Add new hooks:
- `useAllCompensations()` - Fetch all compensations for seller (not just vacation)
- `useUpdateCompensationType()` - Allow seller to change compensation type
- `useMarkCompensationDelivered()` - Mark compensation as delivered
- `useCancelCompensation()` - Cancel a compensation with reason

#### 4.2 Update `useAllVacationData.ts`
Extend to include:
- Compensations grouped by reason (vacation, delivery_failed, agent_issue, etc.)
- Summary counts by reason type
- Filter by status (pending, assigned, delivered)

#### 4.3 Enhance `VacationCompensations.tsx` Page
Add:
- **Tabs**: All | Vacation | Delivery Failed | Agent Issues | Technical Errors
- **Pending Section**: Cards with "Assign Agent" and "Set Delivery Date" buttons
- **Assigned Section**: Cards with agent info and "Mark Delivered" button
- **Completed Section**: Historical delivered compensations
- **Compensation Type Override**: Dropdown to change between extra_delivery/refund/credit
- **Real-time updates**: Subscribe to compensation changes

#### 4.4 Update Dashboard Cards
Add compensation counts to dashboard overview:
- Total pending compensations
- Compensations assigned today
- Compensations delivered today

---

### Phase 5: Real-time Subscription

Add to `useRealtimeSync.tsx`:
```typescript
// Subscribe to vacation_compensations table
const compensationChannel = supabase
  .channel('compensation-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'vacation_compensations',
      filter: `seller_id=eq.${user.id}`,
    },
    () => {
      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
    }
  )
  .subscribe();
```

---

## Summary of Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/xxx_extend_vacation_compensations.sql` | CREATE | Add new columns and compensation_logs table |
| `supabase/migrations/xxx_compensation_triggers.sql` | CREATE | Automatic trigger for failed orders |
| `supabase/functions/scan-missed-deliveries/index.ts` | CREATE | Daily cron to catch missed compensations |
| `src/hooks/useVacationCompensations.ts` | MODIFY | Add new mutation hooks |
| `src/hooks/useAllVacationData.ts` | MODIFY | Extend data fetching |
| `src/pages/VacationCompensations.tsx` | MODIFY | Enhanced UI with tabs and actions |
| `src/hooks/useRealtimeSync.tsx` | MODIFY | Add compensation subscription |
| `supabase/config.toml` | MODIFY | Add new edge function config |

---

## Technical Considerations

1. **Duplicate Prevention**: Both triggers and edge function check for existing compensations before creating
2. **Status Flow**: pending → assigned → delivered (or cancelled at any point)
3. **Reason Auto-Detection**: Vacation periods checked automatically; status-based reason otherwise
4. **Seller Override**: Seller can change compensation_type manually if needed
5. **Agent Assignment**: Can be done at creation or later
6. **Dashboard Sync**: Compensation counts update in real-time via Supabase realtime

