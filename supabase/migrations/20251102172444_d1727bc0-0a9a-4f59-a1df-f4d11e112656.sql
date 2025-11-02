-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to notify seller of new order via edge function
CREATE OR REPLACE FUNCTION notify_seller_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Make async HTTP request to edge function
  SELECT net.http_post(
    url := 'https://amhpjsmubciahslghobw.supabase.co/functions/v1/sendLiveOrderNotification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'orderId', NEW.id::text
    )
  ) INTO request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the order insertion
    RAISE WARNING 'Failed to send order notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_notify_seller_new_order ON orders;
CREATE TRIGGER trigger_notify_seller_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_new_order();