-- Create function to automatically assign packed orders to delivery agents
CREATE OR REPLACE FUNCTION public.auto_assign_to_delivery_agent()
RETURNS TRIGGER AS $$
DECLARE
  available_agent_id UUID;
BEGIN
  -- Only act when status changes to 'packed'
  IF NEW.status = 'packed' AND OLD.status != 'packed' THEN
    -- Find an available delivery agent
    SELECT id INTO available_agent_id
    FROM delivery_agents 
    WHERE is_active = true 
      AND is_online = true
    ORDER BY 
      deliveries_today ASC,  -- Prefer agents with fewer deliveries today
      average_rating DESC,   -- Prefer higher rated agents
      last_delivery_at ASC   -- Prefer agents who haven't delivered recently
    LIMIT 1;
    
    -- If an agent is found, assign the order and update status
    IF available_agent_id IS NOT NULL THEN
      UPDATE orders 
      SET 
        agent_id = available_agent_id,
        status = 'assigned',
        updated_at = now()
      WHERE id = NEW.id;
      
      -- Create notification for the assigned agent
      INSERT INTO agent_notifications (
        agent_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        available_agent_id,
        'new_delivery_assignment',
        'New Delivery Assignment',
        'You have been assigned a new delivery for order #' || NEW.id::text,
        jsonb_build_object(
          'order_id', NEW.id,
          'customer_name', NEW.customer_name,
          'total_amount', NEW.total,
          'address', NEW.address,
          'assigned_at', now()
        )
      );
      
      -- Update agent's delivery count for today
      UPDATE delivery_agents 
      SET 
        deliveries_today = deliveries_today + 1,
        updated_at = now()
      WHERE id = available_agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-assign orders when packed
DROP TRIGGER IF EXISTS trigger_auto_assign_delivery ON orders;
CREATE TRIGGER trigger_auto_assign_delivery
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_to_delivery_agent();