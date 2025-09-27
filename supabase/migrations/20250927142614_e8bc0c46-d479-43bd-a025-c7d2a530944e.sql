-- Create trigger to notify sellers immediately when new orders are placed
CREATE OR REPLACE FUNCTION public.notify_sellers_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_ids UUID[];
  seller_id UUID;
BEGIN
  -- Extract seller IDs from the order items
  SELECT extract_seller_ids_from_order(NEW.items) INTO seller_ids;
  
  -- Create notifications for each seller
  FOREACH seller_id IN ARRAY seller_ids
  LOOP
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      role,
      reference_id,
      metadata
    ) VALUES (
      seller_id,
      '🚨 NEW ORDER RECEIVED!',
      'You have received a new order from ' || NEW.customer_name || ' worth ₹' || NEW.total || '. Action required immediately!',
      'new_order',
      'seller',
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.id,
        'customer_name', NEW.customer_name,
        'total_amount', NEW.total,
        'urgency', 'high',
        'created_at', NEW.created_at
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on orders table
DROP TRIGGER IF EXISTS trigger_notify_sellers_on_new_order ON orders;
CREATE TRIGGER trigger_notify_sellers_on_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_new_order();