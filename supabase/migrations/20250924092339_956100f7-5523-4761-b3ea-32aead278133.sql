-- Create function to notify delivery agents when order is accepted
CREATE OR REPLACE FUNCTION notify_agents_on_order_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  payload JSONB;
  response TEXT;
BEGIN
  -- Only trigger when status changes to accepted, confirmed, or packed
  IF NEW.status IN ('accepted', 'confirmed', 'packed') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'confirmed', 'packed')) THEN
    
    -- Prepare payload for edge function
    payload := jsonb_build_object(
      'orderId', NEW.id,
      'orderStatus', NEW.status,
      'orderData', jsonb_build_object(
        'id', NEW.id,
        'customer_name', NEW.customer_name,
        'customer_phone', NEW.customer_phone,
        'total', NEW.total,
        'address', NEW.address,
        'items', NEW.items,
        'status', NEW.status,
        'created_at', NEW.created_at
      )
    );
    
    -- Call the edge function to notify delivery agents
    -- This is done asynchronously to not block the order update
    BEGIN
      SELECT extensions.http_post(
        url := 'https://amhpjsmubciahslghobw.supabase.co/functions/v1/notify-delivery-agents',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := payload
      ) INTO response;
      
      -- Log successful notification
      INSERT INTO password_reset_logs (
        email,
        event_type,
        metadata
      ) VALUES (
        'system@zaago.com',
        'email_sent',
        jsonb_build_object(
          'action', 'agent_notification_triggered',
          'order_id', NEW.id,
          'order_status', NEW.status,
          'trigger_time', now(),
          'function_response', response
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the order update
      INSERT INTO password_reset_logs (
        email,
        event_type,
        metadata,
        error
      ) VALUES (
        'system@zaago.com',
        'email_sent',
        jsonb_build_object(
          'action', 'agent_notification_failed',
          'order_id', NEW.id,
          'order_status', NEW.status,
          'error_time', now()
        ),
        SQLERRM
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_notify_agents_on_acceptance ON orders;
CREATE TRIGGER trigger_notify_agents_on_acceptance
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_agents_on_order_acceptance();

-- Add columns to track agent notification status
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS agent_notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agent_notification_sent_at TIMESTAMP WITH TIME ZONE;