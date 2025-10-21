-- Drop the blocking trigger that prevents order updates
DROP TRIGGER IF EXISTS order_status_update_notification ON orders;

-- Drop the function that was causing the blocking behavior
DROP FUNCTION IF EXISTS notify_customer_order_update();