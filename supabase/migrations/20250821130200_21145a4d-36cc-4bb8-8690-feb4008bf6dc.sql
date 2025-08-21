-- Data synchronization fixes and missing table relationships

-- 1. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_history_agent_id ON delivery_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_history_delivery_date ON delivery_history(delivery_date);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- 2. Fix get_seller_orders function to handle status filtering properly
CREATE OR REPLACE FUNCTION public.get_seller_orders(seller_user_id uuid, status_filter text[] DEFAULT NULL)
RETURNS TABLE(
  order_id uuid,
  user_id uuid, 
  customer_name text,
  customer_phone text,
  address jsonb,
  items jsonb,
  total numeric,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  delivery_date date,
  agent_id uuid,
  delivered boolean,
  payment_status text,
  special_instructions text,
  seller_total numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if caller is admin or the seller themselves
  IF NOT (is_current_user_admin_v2() OR auth.uid() = seller_user_id) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    o.id as order_id,
    o.user_id,
    o.customer_name,
    o.customer_phone,
    o.address,
    o.items,
    o.total,
    o.status,
    o.created_at,
    o.updated_at,
    o.delivery_date,
    o.agent_id,
    o.delivered,
    o.payment_status,
    o.special_instructions,
    -- Calculate seller total from items that belong to this seller
    (
      SELECT COALESCE(SUM(
        (item->>'quantity')::INTEGER * (item->>'price')::NUMERIC
      ), 0)
      FROM jsonb_array_elements(o.items) AS item
      WHERE (item->>'id')::UUID IN (
        SELECT p.id FROM products p WHERE p.seller_id = seller_user_id
      )
    ) as seller_total
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND (status_filter IS NULL OR o.status = ANY(status_filter))
  ORDER BY o.created_at DESC;
END;
$$;

-- 3. Add missing inventory sync function
CREATE OR REPLACE FUNCTION public.sync_product_inventory_after_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    item JSONB;
    product_record RECORD;
BEGIN
    -- Only process when order is marked as delivered
    IF NEW.delivered = true AND (OLD.delivered = false OR OLD.delivered IS NULL) THEN
        -- Loop through each item in the order to update inventory
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            -- Get current product info
            SELECT id, stock_quantity, name INTO product_record
            FROM products 
            WHERE id = (item->>'id')::uuid;
            
            IF FOUND THEN
                -- Update inventory based on delivered quantity
                UPDATE products 
                SET 
                    stock_quantity = GREATEST(0, stock_quantity - (item->>'quantity')::integer),
                    updated_at = now()
                WHERE id = product_record.id;
                
                -- Log inventory change
                INSERT INTO security_audit_log (
                    user_id,
                    action,
                    resource,
                    details
                ) VALUES (
                    NEW.user_id,
                    'inventory_sync',
                    'products',
                    jsonb_build_object(
                        'product_id', product_record.id,
                        'product_name', product_record.name,
                        'order_id', NEW.id,
                        'quantity_delivered', (item->>'quantity')::integer,
                        'previous_stock', product_record.stock_quantity,
                        'new_stock', GREATEST(0, product_record.stock_quantity - (item->>'quantity')::integer)
                    )
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. Create trigger for inventory sync
DROP TRIGGER IF EXISTS sync_inventory_on_delivery ON orders;
CREATE TRIGGER sync_inventory_on_delivery
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_inventory_after_delivery();

-- 5. Add order status sync function for delivery agents
CREATE OR REPLACE FUNCTION public.sync_order_status_with_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- When delivery history is created, ensure order is marked as delivered
    UPDATE orders 
    SET 
        delivered = true,
        status = 'delivered',
        updated_at = now()
    WHERE id = NEW.order_id 
    AND (delivered != true OR status != 'delivered');
    
    RETURN NEW;
END;
$$;

-- 6. Create trigger for order status sync
DROP TRIGGER IF EXISTS sync_order_status_on_delivery_history ON delivery_history;
CREATE TRIGGER sync_order_status_on_delivery_history
    AFTER INSERT ON delivery_history
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_status_with_delivery();

-- 7. Add function to ensure data consistency between orders and delivery_history
CREATE OR REPLACE FUNCTION public.ensure_delivery_data_consistency()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Sync delivered orders that don't have delivery history
    INSERT INTO delivery_history (
        order_id,
        agent_id,
        customer_name,
        customer_phone,
        delivery_address,
        items,
        total_amount,
        payment_status,
        delivery_date,
        completed_at
    )
    SELECT 
        o.id,
        o.agent_id,
        o.customer_name,
        o.customer_phone,
        o.address,
        o.items,
        o.total,
        o.payment_status,
        o.delivery_date,
        COALESCE(o.updated_at, o.created_at)
    FROM orders o
    WHERE o.delivered = true 
    AND o.status = 'delivered'
    AND NOT EXISTS (
        SELECT 1 FROM delivery_history dh 
        WHERE dh.order_id = o.id
    );
    
    -- Mark orders as delivered if they have delivery history
    UPDATE orders 
    SET 
        delivered = true,
        status = 'delivered',
        updated_at = now()
    WHERE id IN (
        SELECT DISTINCT order_id 
        FROM delivery_history 
        WHERE order_id NOT IN (
            SELECT id FROM orders 
            WHERE delivered = true AND status = 'delivered'
        )
    );
END;
$$;

-- 8. Run the consistency check
SELECT ensure_delivery_data_consistency();

-- 9. Add notification sync for delivery updates
CREATE OR REPLACE FUNCTION public.notify_seller_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    seller_ids uuid[];
    seller_id uuid;
    order_total numeric;
BEGIN
    -- Get all seller IDs from the order items
    SELECT ARRAY(
        SELECT DISTINCT p.seller_id
        FROM jsonb_array_elements(NEW.items) AS item
        JOIN products p ON (item->>'id')::uuid = p.id
    ) INTO seller_ids;
    
    -- Calculate total for this delivery
    SELECT NEW.total_amount INTO order_total;
    
    -- Send notification to each seller
    FOREACH seller_id IN ARRAY seller_ids
    LOOP
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            order_id
        ) VALUES (
            seller_id,
            'Product Delivered Successfully! 🎉',
            'Your product in order #' || NEW.order_id::text || ' has been delivered to the customer. Total: ₹' || order_total,
            'delivery_success',
            NEW.order_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- 10. Create trigger for delivery notifications
DROP TRIGGER IF EXISTS notify_seller_on_delivery ON delivery_history;
CREATE TRIGGER notify_seller_on_delivery
    AFTER INSERT ON delivery_history
    FOR EACH ROW
    EXECUTE FUNCTION notify_seller_on_delivery();