-- Create function to update seller order status (pack orders)
CREATE OR REPLACE FUNCTION public.update_seller_order_status(
  p_order_id UUID,
  p_seller_user_id UUID,
  p_action TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  seller_products_count INTEGER;
  all_products_packed BOOLEAN;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Count seller's products in this order
  SELECT COUNT(*) INTO seller_products_count
  FROM (
    SELECT DISTINCT (item->>'id')::uuid as product_id
    FROM jsonb_array_elements(order_record.items) AS item
    WHERE (item->>'seller_id')::uuid = p_seller_user_id
  ) seller_items;
  
  IF seller_products_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No products found for this seller in the order'
    );
  END IF;
  
  -- Handle pack action
  IF p_action = 'pack' THEN
    -- Update all seller's products to packed status
    UPDATE order_product_status 
    SET 
      status = 'packed',
      packed_at = now(),
      updated_at = now()
    WHERE order_id = p_order_id 
    AND seller_id = p_seller_user_id
    AND status = 'accepted';
    
    -- Check if all products in the order are now packed
    SELECT NOT EXISTS(
      SELECT 1 
      FROM (
        SELECT DISTINCT 
          (item->>'id')::uuid as product_id,
          (item->>'seller_id')::uuid as seller_id
        FROM jsonb_array_elements(order_record.items) AS item
      ) all_order_items
      LEFT JOIN order_product_status ops ON (
        ops.order_id = p_order_id 
        AND ops.product_id = all_order_items.product_id 
        AND ops.seller_id = all_order_items.seller_id
        AND ops.status = 'packed'
      )
      WHERE ops.id IS NULL
    ) INTO all_products_packed;
    
    -- If all products are packed, update order status
    IF all_products_packed THEN
      UPDATE orders 
      SET status = 'packed', 
          updated_at = now()
      WHERE id = p_order_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'All products packed! Order ready for delivery'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Your products have been packed successfully'
      );
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unsupported action: ' || p_action
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Database error: ' || SQLERRM
  );
END;
$$;