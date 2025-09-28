-- Create immediate seller notification trigger on new orders
-- This ensures sellers get notified immediately when any order is placed

-- First, create the function to notify sellers on new orders
CREATE OR REPLACE FUNCTION public.notify_sellers_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_ids uuid[];
  seller_id uuid;
  notification_title text;
  notification_message text;
BEGIN
  -- Extract unique seller IDs from the order items
  SELECT extract_seller_ids_from_order(NEW.items) INTO seller_ids;
  
  -- Loop through each seller and create notifications
  FOREACH seller_id IN ARRAY seller_ids
  LOOP
    -- Create notification title and message
    notification_title := 'New Order Received! 🎉';
    notification_message := 'You have received a new order from ' || COALESCE(NEW.customer_name, 'a customer') || 
                           '. Order total: ₹' || NEW.total || 
                           '. Please review and accept the order items.';
    
    -- Insert notification for this seller
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      role,
      order_id,
      metadata
    ) VALUES (
      seller_id,
      notification_title,
      notification_message,
      'new_order',
      'seller',
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.id,
        'customer_name', NEW.customer_name,
        'order_total', NEW.total,
        'order_status', NEW.status,
        'created_at', NEW.created_at
      )
    );
  END LOOP;
  
  -- Log the notification creation
  INSERT INTO password_reset_logs (
    email,
    event_type,
    metadata
  ) VALUES (
    'system@zaago.com',
    'email_sent',
    jsonb_build_object(
      'action', 'seller_notifications_created',
      'order_id', NEW.id,
      'seller_count', array_length(seller_ids, 1),
      'seller_ids', seller_ids,
      'notification_type', 'new_order'
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Create the trigger that fires on INSERT to orders table
DROP TRIGGER IF EXISTS trigger_notify_sellers_on_new_order ON public.orders;
CREATE TRIGGER trigger_notify_sellers_on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sellers_on_new_order();

-- Test the trigger by creating a sample notification (this will be cleaned up)
-- First, let's make sure we enable realtime for notifications if not already done
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
-- Add notifications to realtime publication  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;