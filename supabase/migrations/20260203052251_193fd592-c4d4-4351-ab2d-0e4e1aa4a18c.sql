-- =====================================================
-- Extend vacation_compensations table with new columns
-- =====================================================

-- Add new columns to support broader compensation scenarios
ALTER TABLE vacation_compensations 
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id),
  ADD COLUMN IF NOT EXISTS daily_order_id UUID REFERENCES daily_orders(id),
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'vacation',
  ADD COLUMN IF NOT EXISTS compensation_type TEXT DEFAULT 'extra_delivery',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS delivery_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Add check constraints for reason and compensation_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vacation_compensations_reason_check'
  ) THEN
    ALTER TABLE vacation_compensations ADD CONSTRAINT vacation_compensations_reason_check 
      CHECK (reason IN ('vacation', 'technical_error', 'delivery_failed', 'agent_issue', 'seller_failure'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vacation_compensations_type_check'
  ) THEN
    ALTER TABLE vacation_compensations ADD CONSTRAINT vacation_compensations_type_check 
      CHECK (compensation_type IN ('extra_delivery', 'refund', 'credit'));
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vacation_compensations_order_id ON vacation_compensations(order_id);
CREATE INDEX IF NOT EXISTS idx_vacation_compensations_daily_order_id ON vacation_compensations(daily_order_id);
CREATE INDEX IF NOT EXISTS idx_vacation_compensations_customer_id ON vacation_compensations(customer_id);
CREATE INDEX IF NOT EXISTS idx_vacation_compensations_reason ON vacation_compensations(reason);
CREATE INDEX IF NOT EXISTS idx_vacation_compensations_status ON vacation_compensations(status);

-- =====================================================
-- Create compensation_logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS compensation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compensation_id UUID NOT NULL REFERENCES vacation_compensations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID,
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_compensation_logs_compensation_id ON compensation_logs(compensation_id);
CREATE INDEX IF NOT EXISTS idx_compensation_logs_action ON compensation_logs(action);
CREATE INDEX IF NOT EXISTS idx_compensation_logs_created_at ON compensation_logs(created_at);

-- Enable RLS on compensation_logs
ALTER TABLE compensation_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for vacation_compensations
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Sellers can manage their compensations" ON vacation_compensations;
DROP POLICY IF EXISTS "Sellers can view their compensations" ON vacation_compensations;
DROP POLICY IF EXISTS "Sellers can insert compensations" ON vacation_compensations;
DROP POLICY IF EXISTS "Sellers can update their compensations" ON vacation_compensations;

-- Sellers can view compensations for their products
CREATE POLICY "Sellers can view their compensations"
ON vacation_compensations FOR SELECT
USING (seller_id = auth.uid());

-- Sellers can insert compensations for their products
CREATE POLICY "Sellers can insert compensations"
ON vacation_compensations FOR INSERT
WITH CHECK (seller_id = auth.uid());

-- Sellers can update compensations for their products
CREATE POLICY "Sellers can update their compensations"
ON vacation_compensations FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- =====================================================
-- RLS Policies for compensation_logs
-- =====================================================

-- Sellers can view logs for their compensations
CREATE POLICY "Sellers can view their compensation logs"
ON compensation_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vacation_compensations vc 
  WHERE vc.id = compensation_logs.compensation_id 
  AND vc.seller_id = auth.uid()
));

-- Sellers can insert logs for their compensations
CREATE POLICY "Sellers can insert compensation logs"
ON compensation_logs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM vacation_compensations vc 
  WHERE vc.id = compensation_logs.compensation_id 
  AND vc.seller_id = auth.uid()
));

-- =====================================================
-- Function to log compensation changes
-- =====================================================

CREATE OR REPLACE FUNCTION log_compensation_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO compensation_logs (compensation_id, action, performed_by, new_status, metadata)
    VALUES (
      NEW.id,
      'created',
      auth.uid(),
      NEW.status,
      jsonb_build_object('reason', NEW.reason, 'compensation_type', NEW.compensation_type)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO compensation_logs (compensation_id, action, performed_by, previous_status, new_status, metadata)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'assigned' THEN 'agent_assigned'
        WHEN NEW.status = 'delivered' THEN 'delivered'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        ELSE 'status_changed'
      END,
      auth.uid(),
      OLD.status,
      NEW.status,
      CASE 
        WHEN NEW.status = 'assigned' THEN jsonb_build_object('agent_id', NEW.assigned_agent_id)
        WHEN NEW.status = 'cancelled' THEN jsonb_build_object('reason', NEW.cancelled_reason)
        ELSE '{}'::jsonb
      END
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.compensation_type IS DISTINCT FROM NEW.compensation_type THEN
    INSERT INTO compensation_logs (compensation_id, action, performed_by, metadata)
    VALUES (
      NEW.id,
      'type_changed',
      auth.uid(),
      jsonb_build_object('previous_type', OLD.compensation_type, 'new_type', NEW.compensation_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging
DROP TRIGGER IF EXISTS trigger_log_compensation_change ON vacation_compensations;
CREATE TRIGGER trigger_log_compensation_change
AFTER INSERT OR UPDATE ON vacation_compensations
FOR EACH ROW
EXECUTE FUNCTION log_compensation_change();

-- =====================================================
-- Automatic Compensation Creation Triggers
-- =====================================================

-- Function to create compensation on order delivery failure
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
  v_item JSONB;
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

  -- Get first item from order items
  v_item := NEW.items->0;
  
  -- Try to get product_id from items
  IF v_item IS NOT NULL THEN
    v_product_id := (v_item->>'product_id')::UUID;
    IF v_product_id IS NULL THEN
      v_product_id := (v_item->>'id')::UUID;
    END IF;
    v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);
  END IF;

  -- Get seller_id from product if available
  IF v_product_id IS NOT NULL THEN
    SELECT seller_id INTO v_seller_id FROM products WHERE id = v_product_id;
  END IF;

  -- Fallback to order's seller_id
  IF v_seller_id IS NULL THEN
    v_seller_id := NEW.seller_id;
  END IF;

  -- If no seller found, skip
  IF v_seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_subscription_id := NEW.subscription_id;

  -- Get customer_id from subscription if available
  IF v_subscription_id IS NOT NULL THEN
    SELECT customer_id INTO v_customer_id FROM subscriptions WHERE id = v_subscription_id;
  END IF;

  -- Check if delivery date falls within active vacation period
  IF v_subscription_id IS NOT NULL THEN
    SELECT id INTO v_vacation_period_id
    FROM subscription_vacation_periods
    WHERE subscription_id = v_subscription_id
      AND status = 'active'
      AND COALESCE(NEW.delivery_date::date, NEW.created_at::date) BETWEEN start_date AND end_date;

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
    v_seller_id,
    COALESCE(NEW.delivery_date::date, NEW.created_at::date),
    COALESCE(v_quantity, 1),
    v_reason,
    'extra_delivery',
    'pending',
    now()
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the order update
  RAISE WARNING 'Failed to create compensation for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_create_compensation_on_failure ON orders;
CREATE TRIGGER trigger_create_compensation_on_failure
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION create_compensation_on_delivery_failure();

-- =====================================================
-- Function to create compensation on daily_order failure
-- =====================================================

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
  IF NEW.status NOT IN ('failed', 'undelivered', 'cancelled_agent', 'not_delivered', 'delivery_failed') THEN
    RETURN NEW;
  END IF;

  -- Skip if already delivered
  IF OLD.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  -- Check duplicate by daily_order_id
  SELECT id INTO v_existing
  FROM vacation_compensations
  WHERE daily_order_id = NEW.id;

  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Also check by subscription_id + date combo
  SELECT id INTO v_existing
  FROM vacation_compensations
  WHERE subscription_id = NEW.subscription_id
    AND original_vacation_date = NEW.date
    AND daily_order_id IS NULL
    AND order_id IS NULL;

  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get subscription details
  SELECT * INTO v_subscription FROM subscriptions WHERE id = NEW.subscription_id;
  
  IF v_subscription IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get product details
  SELECT * INTO v_product FROM products WHERE id = v_subscription.product_id;
  
  IF v_product IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check vacation
  SELECT id INTO v_vacation_period_id
  FROM subscription_vacation_periods
  WHERE subscription_id = NEW.subscription_id
    AND status = 'active'
    AND NEW.date BETWEEN start_date AND end_date;

  v_is_vacation := v_vacation_period_id IS NOT NULL;
  
  v_reason := CASE 
    WHEN v_is_vacation THEN 'vacation'
    WHEN NEW.status = 'cancelled_agent' THEN 'agent_issue'
    ELSE 'delivery_failed'
  END;

  -- Insert compensation
  INSERT INTO vacation_compensations (
    subscription_id,
    vacation_period_id,
    daily_order_id,
    customer_id,
    product_id,
    seller_id,
    original_vacation_date,
    quantity,
    reason,
    compensation_type,
    status,
    delivery_failed_at
  ) VALUES (
    NEW.subscription_id,
    v_vacation_period_id,
    NEW.id,
    NEW.customer_id,
    v_subscription.product_id,
    v_product.seller_id,
    NEW.date,
    NEW.quantity,
    v_reason,
    'extra_delivery',
    'pending',
    now()
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the daily_order update
  RAISE WARNING 'Failed to create compensation for daily_order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on daily_orders table
DROP TRIGGER IF EXISTS trigger_daily_order_compensation ON daily_orders;
CREATE TRIGGER trigger_daily_order_compensation
AFTER UPDATE ON daily_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION create_compensation_for_daily_order_failure();