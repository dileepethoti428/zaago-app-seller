-- ========================================
-- IST-Based Subscription Order Management
-- Database Setup and Cron Jobs
-- ========================================

-- Step 1: Add accepted_at column to orders table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'accepted_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX idx_orders_accepted_at ON orders(accepted_at) WHERE accepted_at IS NOT NULL;
    END IF;
END $$;

-- Step 2: Create subscription_order_logs table for tracking date shifts
CREATE TABLE IF NOT EXISTS subscription_order_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'accepted', 'not_accepted', 'date_shifted', 'cancelled')),
  original_date DATE,
  new_date DATE,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_order_logs_subscription ON subscription_order_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_order_logs_order ON subscription_order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_subscription_order_logs_event ON subscription_order_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_order_logs_created ON subscription_order_logs(created_at);

-- Add RLS policies for subscription_order_logs
ALTER TABLE subscription_order_logs ENABLE ROW LEVEL SECURITY;

-- Allow sellers to view logs for their subscriptions
CREATE POLICY "Sellers can view their subscription logs"
ON subscription_order_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN products p ON s.product_id = p.id
    WHERE s.id = subscription_order_logs.subscription_id
    AND p.seller_id = auth.uid()
  )
);

-- Service role can insert logs
CREATE POLICY "Service role can insert logs"
ON subscription_order_logs FOR INSERT
WITH CHECK (true);

-- Step 3: Create index on orders for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_subscription_pending ON orders(subscription_id, expected_delivery_date, status) 
WHERE subscription_id IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_expected_delivery ON orders(expected_delivery_date) 
WHERE subscription_id IS NOT NULL;

-- Step 4: Enable pg_cron and pg_net extensions (required for scheduling)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 5: Schedule edge function to check unaccepted orders (11:00 PM IST = 5:30 PM UTC)
-- This runs daily at 11:00 PM IST to mark unaccepted orders and extend subscriptions
SELECT cron.schedule(
  'check-unaccepted-orders-11pm-ist',
  '30 17 * * *', -- 5:30 PM UTC = 11:00 PM IST
  $$
  SELECT net.http_post(
    url:='https://amhpjsmubciahslghobw.supabase.co/functions/v1/check-unaccepted-orders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHBqc211YmNpYWhzbGdob2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzAxNjksImV4cCI6MjA3MTEwNjE2OX0.QtKx2Nvm0MkIgJUXSoUxQH20l7W-UyzdVInVps_z70Y"}'::jsonb,
    body:=concat('{"triggered_at": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Step 6: Update existing cron job for creating subscription orders (11:30 PM IST = 6:00 PM UTC)
-- First, unschedule the old job if it exists
SELECT cron.unschedule('process-daily-subscriptions-11-30pm-ist');

-- Then create the new one at the correct time
SELECT cron.schedule(
  'process-daily-subscriptions-11-30pm-ist',
  '0 18 * * *', -- 6:00 PM UTC = 11:30 PM IST
  $$
  SELECT net.http_post(
    url:='https://amhpjsmubciahslghobw.supabase.co/functions/v1/process-daily-subscriptions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHBqc211YmNpYWhzbGdob2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzAxNjksImV4cCI6MjA3MTEwNjE2OX0.QtKx2Nvm0MkIgJUXSoUxQH20l7W-UyzdVInVps_z70Y"}'::jsonb,
    body:=concat('{"triggered_at": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Step 7: Update existing midnight IST job for updating subscription dates (12:00 AM IST = 6:30 PM UTC)
SELECT cron.unschedule('update-subscription-dates-midnight-ist');

SELECT cron.schedule(
  'update-subscription-dates-midnight-ist',
  '30 18 * * *', -- 6:30 PM UTC = 12:00 AM IST
  $$
  SELECT net.http_post(
    url:='https://amhpjsmubciahslghobw.supabase.co/functions/v1/update-subscription-dates',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHBqc211YmNpYWhzbGdob2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzAxNjksImV4cCI6MjA3MTEwNjE2OX0.QtKx2Nvm0MkIgJUXSoUxQH20l7W-UyzdVInVps_z70Y"}'::jsonb,
    body:=concat('{"triggered_at": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Verify cron jobs are scheduled
SELECT * FROM cron.job WHERE jobname IN (
  'check-unaccepted-orders-11pm-ist',
  'process-daily-subscriptions-11-30pm-ist',
  'update-subscription-dates-midnight-ist'
);

-- ========================================
-- Summary of Scheduled Jobs (IST Time)
-- ========================================
-- 11:00 PM IST (5:30 PM UTC): Check unaccepted orders, mark as not_accepted, extend subscriptions
-- 11:30 PM IST (6:00 PM UTC): Create new subscription orders for tomorrow
-- 12:00 AM IST (6:30 PM UTC): Update next_delivery_date to tomorrow for all active subscriptions
-- ========================================
