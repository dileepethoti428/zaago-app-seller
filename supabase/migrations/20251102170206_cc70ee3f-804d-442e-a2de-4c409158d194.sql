-- Enable pg_net extension for async HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to notify order status changes
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT := 'https://amhpjsmubciahslghobw.supabase.co';
  service_role_key TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get service role key from vault
    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
    
    -- If service role key not found in vault, use environment variable
    IF service_role_key IS NULL THEN
      service_role_key := current_setting('app.settings.service_role_key', true);
    END IF;
    
    -- Make async HTTP request to edge function
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-order-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'orderId', NEW.id,
        'status', NEW.status,
        'userId', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_notify_order_status_change ON orders;

CREATE TRIGGER trigger_notify_order_status_change
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_status_change();