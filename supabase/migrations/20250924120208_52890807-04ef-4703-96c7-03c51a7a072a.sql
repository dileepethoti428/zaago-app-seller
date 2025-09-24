-- Fix the trigger to properly call the edge function
CREATE OR REPLACE FUNCTION notify_agents_on_order_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  response record;
BEGIN
  -- Only trigger when status changes to accepted, confirmed, or packed
  IF NEW.status IN ('accepted', 'confirmed', 'packed') 
     AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    
    BEGIN
      -- Call the edge function using HTTP extension
      SELECT * INTO response FROM http((
        'POST',
        'https://amhpjsmubciahslghobw.supabase.co/functions/v1/notify-delivery-agents',
        ARRAY[
          http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHBqc211YmNpYWhzbGdob2J3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUzMDE2OSwiZXhwIjoyMDcxMTA2MTY5fQ.JjXY5uy93IzJiPQwPKbgpqAP12RDPl0oGp1VaDKT8OE'),
          http_header('Content-Type', 'application/json')
        ],
        'application/json',
        jsonb_build_object(
          'orderId', NEW.id,
          'orderStatus', NEW.status,
          'orderData', row_to_json(NEW)
        )::text
      ));
      
      -- Log successful call
      RAISE NOTICE 'Edge function called successfully: %', response.status;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the order update
      RAISE WARNING 'Failed to call notify-delivery-agents function: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;