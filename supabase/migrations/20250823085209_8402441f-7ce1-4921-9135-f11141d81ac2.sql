-- Create seller-specific notifications table and functions

-- Function to create seller notifications for stock issues
CREATE OR REPLACE FUNCTION public.check_and_notify_stock_issues()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for low stock (less than 5 items)
  IF NEW.stock_quantity <= 5 AND NEW.stock_quantity > 0 THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      role
    ) VALUES (
      NEW.seller_id,
      'Low Stock Alert',
      'Product "' || NEW.name || '" is running low on stock (' || NEW.stock_quantity || ' items remaining)',
      'stock_alert',
      'seller'
    );
  END IF;
  
  -- Check for out of stock
  IF NEW.stock_quantity = 0 AND OLD.stock_quantity > 0 THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      role
    ) VALUES (
      NEW.seller_id,
      'Out of Stock Alert',
      'Product "' || NEW.name || '" is now out of stock',
      'stock_alert',
      'seller'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check stock on product updates
CREATE TRIGGER check_stock_levels_trigger
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_and_notify_stock_issues();

-- Function to notify seller when their product is delivered
CREATE OR REPLACE FUNCTION public.notify_seller_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  product_record RECORD;
BEGIN
  -- Only trigger when order status changes to delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Get seller info for each product in the order
    FOR product_record IN
      SELECT DISTINCT p.seller_id, p.name as product_name
      FROM products p
      WHERE p.id IN (
        SELECT (item->>'id')::uuid
        FROM jsonb_array_elements(NEW.items) AS item
      )
    LOOP
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        role,
        order_id
      ) VALUES (
        product_record.seller_id,
        'Product Delivered',
        'Your product "' || product_record.product_name || '" has been delivered successfully',
        'delivery',
        'seller',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to notify sellers on delivery
CREATE TRIGGER notify_seller_delivery_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_on_delivery();