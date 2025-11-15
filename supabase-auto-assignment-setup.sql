-- Create subscription_order_automation_logs table for monitoring
CREATE TABLE IF NOT EXISTS subscription_order_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_subscriptions INTEGER NOT NULL DEFAULT 0,
  orders_created INTEGER NOT NULL DEFAULT 0,
  orders_assigned INTEGER NOT NULL DEFAULT 0,
  failed_assignments INTEGER NOT NULL DEFAULT 0,
  error_details JSONB,
  processing_duration INTEGER, -- in seconds
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(processing_date)
);

-- Enable RLS
ALTER TABLE subscription_order_automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view automation logs"
  ON subscription_order_automation_logs
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin_v2());

CREATE POLICY "System can insert automation logs"
  ON subscription_order_automation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_automation_logs_date 
  ON subscription_order_automation_logs(processing_date DESC);

-- Schedule auto-assignment cron job
-- Runs every 5 minutes from 6:00 PM to 11:30 PM UTC (11:30 PM to 5:00 AM IST)
SELECT cron.schedule(
  'auto-assign-delivery-agents',
  '*/5 18-23 * * *',
  $$
  SELECT net.http_post(
    url:='https://amhpjsmubciahslghobw.supabase.co/functions/v1/auto-assign-delivery-agents',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHBqc211YmNpYWhzbGdob2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzAxNjksImV4cCI6MjA3MTEwNjE2OX0.QtKx2Nvm0MkIgJUXSoUxQH20l7W-UyzdVInVps_z70Y"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Verify cron job was created
SELECT * FROM cron.job WHERE jobname = 'auto-assign-delivery-agents';
