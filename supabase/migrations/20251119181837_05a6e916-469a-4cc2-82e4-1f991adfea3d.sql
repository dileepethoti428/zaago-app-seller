-- Add visibility tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS visible_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS acceptance_window_expired BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_accepted_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_visible_until 
ON orders(visible_until) 
WHERE visible_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_visible_pending 
ON orders(visible, status) 
WHERE visible = true AND status IN ('pending', 'pending_seller_acceptance', 'pending_after_cutoff');

CREATE INDEX IF NOT EXISTS idx_orders_acceptance_window 
ON orders(acceptance_window_expired, visible_until) 
WHERE acceptance_window_expired = true;

-- Add comments
COMMENT ON COLUMN orders.visible_until IS 'IST timestamp when order visibility window expires (11:30 AM next day)';
COMMENT ON COLUMN orders.visible IS 'Whether order is visible in pending list';
COMMENT ON COLUMN orders.acceptance_window_expired IS 'Flag set when visible_until passes without seller acceptance';
COMMENT ON COLUMN orders.seller_accepted_at IS 'IST timestamp when seller accepted the order';

-- Create order visibility logs table
CREATE TABLE IF NOT EXISTS order_visibility_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status_before TEXT,
  status_after TEXT,
  visible_until TIMESTAMP WITH TIME ZONE,
  acceptance_time TIMESTAMP WITH TIME ZONE,
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for logs
CREATE INDEX IF NOT EXISTS idx_order_visibility_logs_order_id ON order_visibility_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_visibility_logs_event_type ON order_visibility_logs(event_type);

-- Enable RLS on logs table
ALTER TABLE order_visibility_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for visibility logs (allow all authenticated users to view for now)
CREATE POLICY "Authenticated users can view visibility logs"
  ON order_visibility_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert visibility logs"
  ON order_visibility_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);