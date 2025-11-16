-- =====================================================
-- COMPLETE SUBSCRIPTION ORDER AUTOMATION SETUP
-- =====================================================
-- This script sets up the complete subscription automation system
-- with corrected timing, proper column names, and comprehensive logging

-- =====================================================
-- 1. ENSURE REQUIRED COLUMNS EXIST
-- =====================================================

-- Add accepted_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- 2. CREATE SUBSCRIPTION ORDER LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'created', 'accepted', 'not_accepted', 'delivered', 'extended'
  event_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_order_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscription logs"
  ON subscription_order_logs
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert subscription logs"
  ON subscription_order_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_logs_subscription 
  ON subscription_order_logs(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_logs_order 
  ON subscription_order_logs(order_id);

-- =====================================================
-- 3. CREATE AUTOMATION MONITORING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_order_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  job_name TEXT NOT NULL, -- 'create-orders', 'check-acceptance', 'update-dates', 'assign-agents'
  total_processed INTEGER NOT NULL DEFAULT 0,
  successful INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  error_details JSONB,
  processing_duration INTEGER, -- in seconds
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(processing_date, job_name)
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
  ON subscription_order_automation_logs(processing_date DESC, job_name);

-- =====================================================
-- 4. ADD USEFUL INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for finding pending subscription orders by delivery date
CREATE INDEX IF NOT EXISTS idx_orders_subscription_delivery_status 
  ON orders(subscription_id, delivery_date, status, accepted_at)
  WHERE subscription_id IS NOT NULL;

-- Index for finding active subscriptions by next delivery date
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_next_delivery 
  ON subscriptions(next_delivery_date, is_active)
  WHERE is_active = true;

-- =====================================================
-- 5. SCHEDULE CRON JOBS
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- JOB 1: CREATE SUBSCRIPTION ORDERS
-- Runs at 11:30 PM IST (18:00 UTC) every day
-- =====================================================

SELECT cron.schedule(
  'create-subscription-orders-11-30pm-ist',
  '0 18 * * *', -- 6:00 PM UTC = 11:30 PM IST
  $$
  SELECT net.http_post(
    url:='https://amhpjsmubciahslghobw.supabase.co/functions/v1/process-daily-subscriptions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHBqc211YmNpYWhzbGdob2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzAxNjksImV4cCI6MjA3MTEwNjE2OX0.QtKx2Nvm0MkIgJUXSoUxQH20l7W-UyzdVInVps_z70Y"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- =====================================================
-- JOB 2: CHECK UNACCEPTED ORDERS
-- Runs at 11:00 AM IST (05:30 UTC) next day
-- =====================================================

SELECT cron.schedule(
  'check-unaccepted-orders-11am-ist',
  '30 5 * * *', -- 5:30 AM UTC = 11:00 AM IST
  $$
  SELECT net.http_post(
    url:='https://amhpjsmubciahslghobw.supabase.co/functions/v1/check-unaccepted-orders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHBqc211YmNpYWhzbGdob2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzAxNjksImV4cCI6MjA3MTEwNjE2OX0.QtKx2Nvm0MkIgJUXSoUxQH20l7W-UyzdVInVps_z70Y"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- =====================================================
-- JOB 3: UPDATE SUBSCRIPTION DATES
-- Runs at Midnight IST (18:30 UTC) every day
-- =====================================================

SELECT cron.schedule(
  'update-subscription-dates-midnight-ist',
  '30 18 * * *', -- 6:30 PM UTC = 12:00 AM IST (Midnight)
  $$
  SELECT net.http_post(
    url:='https://amhpjsmubciahslghobw.supabase.co/functions/v1/update-subscription-dates',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHBqc211YmNpYWhzbGdob2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzAxNjksImV4cCI6MjA3MTEwNjE2OX0.QtKx2Nvm0MkIgJUXSoUxQH20l7W-UyzdVInVps_z70Y"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- =====================================================
-- JOB 4: AUTO-ASSIGN DELIVERY AGENTS
-- Runs every 5 minutes from 6:00 PM to 11:30 PM UTC (11:30 PM to 5:00 AM IST)
-- =====================================================

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

-- =====================================================
-- 6. VERIFY CRON JOBS WERE CREATED
-- =====================================================

SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job 
WHERE jobname IN (
  'create-subscription-orders-11-30pm-ist',
  'check-unaccepted-orders-11am-ist',
  'update-subscription-dates-midnight-ist',
  'auto-assign-delivery-agents'
)
ORDER BY jobname;

-- =====================================================
-- 7. CREATE HELPER FUNCTION TO VIEW AUTOMATION STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION get_subscription_automation_status()
RETURNS TABLE (
  job_name TEXT,
  last_run_date DATE,
  total_processed INTEGER,
  successful INTEGER,
  failed INTEGER,
  last_run_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (logs.job_name)
    logs.job_name,
    logs.processing_date,
    logs.total_processed,
    logs.successful,
    logs.failed,
    logs.completed_at
  FROM subscription_order_automation_logs logs
  ORDER BY logs.job_name, logs.processing_date DESC, logs.completed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '✅ Subscription Order Automation Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Scheduled Jobs:';
  RAISE NOTICE '1. Create Orders: 11:30 PM IST (18:00 UTC) daily';
  RAISE NOTICE '2. Check Acceptance: 11:00 AM IST (05:30 UTC) daily';
  RAISE NOTICE '3. Update Dates: Midnight IST (18:30 UTC) daily';
  RAISE NOTICE '4. Assign Agents: Every 5 min (18:00-23:00 UTC)';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '- subscription_order_logs';
  RAISE NOTICE '- subscription_order_automation_logs';
  RAISE NOTICE '';
  RAISE NOTICE 'Run "SELECT * FROM cron.job" to verify cron jobs.';
  RAISE NOTICE 'Run "SELECT * FROM get_subscription_automation_status()" to check status.';
END $$;
