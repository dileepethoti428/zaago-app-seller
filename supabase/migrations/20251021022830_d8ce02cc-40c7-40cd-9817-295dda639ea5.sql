-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to send order notification via edge function
CREATE OR REPLACE FUNCTION notify_customer_order_update()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  payload JSONB;
  supabase_url TEXT;
  supabase_anon_key TEXT;
BEGIN
  -- Only proceed if status actually changed and user_id exists
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.user_id IS NOT NULL THEN
    
    -- Get Supabase URL from environment
    supabase_url := current_setting('app.settings.supabase_url', true);
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- If not found in settings, use default from migrations context
    IF supabase_url IS NULL THEN
      supabase_url := 'https://amhpjsmubciahslghobw.supabase.co';
    END IF;
    
    -- Build the edge function URL
    edge_function_url := supabase_url || '/functions/v1/send-order-notification';
    
    -- Build payload
    payload := jsonb_build_object(
      'orderId', NEW.id,
      'status', NEW.status,
      'userId', NEW.user_id
    );
    
    -- Log the notification attempt
    INSERT INTO password_reset_logs (
      email,
      event_type,
      metadata
    ) VALUES (
      'system@zaago.com',
      'email_sent',
      jsonb_build_object(
        'action', 'order_notification_triggered',
        'order_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'user_id', NEW.user_id,
        'timestamp', now()
      )
    );
    
    -- Make async HTTP request to edge function using pg_net
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := payload,
      timeout_milliseconds := 5000
    );
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  INSERT INTO password_reset_logs (
    email,
    event_type,
    metadata,
    error
  ) VALUES (
    'system@zaago.com',
    'email_sent',
    jsonb_build_object(
      'action', 'order_notification_error',
      'order_id', NEW.id,
      'status', NEW.status,
      'user_id', NEW.user_id
    ),
    SQLERRM
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS order_status_update_notification ON orders;

-- Create trigger
CREATE TRIGGER order_status_update_notification
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_order_update();