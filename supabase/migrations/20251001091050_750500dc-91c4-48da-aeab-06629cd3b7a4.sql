-- Function to accept a product in an order
CREATE OR REPLACE FUNCTION public.accept_product_in_order(
  p_order_id UUID,
  p_product_id UUID,
  p_seller_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_updated_items JSONB;
  v_item JSONB;
  v_all_accepted BOOLEAN := true;
BEGIN
  -- Get the order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Update the items array to mark this product as accepted
  v_updated_items := '[]'::jsonb;
  
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    IF (v_item->>'id')::UUID = p_product_id THEN
      -- Mark this item as accepted
      v_item := jsonb_set(v_item, '{status}', '"accepted"'::jsonb);
      v_item := jsonb_set(v_item, '{accepted_at}', to_jsonb(now()));
      v_item := jsonb_set(v_item, '{accepted_by}', to_jsonb(p_seller_id));
    ELSE
      -- Check if other items are not accepted yet
      IF NOT (v_item ? 'status') OR (v_item->>'status') != 'accepted' THEN
        v_all_accepted := false;
      END IF;
    END IF;
    
    v_updated_items := v_updated_items || v_item;
  END LOOP;
  
  -- Update the order with modified items
  UPDATE orders 
  SET 
    items = v_updated_items,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- If all seller items are accepted, update order status to confirmed
  IF v_all_accepted AND v_order.status = 'placed' THEN
    UPDATE orders 
    SET status = 'confirmed'
    WHERE id = p_order_id;
  END IF;
  
  -- Create notification for customer
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    role,
    order_id
  ) VALUES (
    v_order.user_id,
    'Product Accepted',
    'Your product has been accepted by the seller',
    'order_update',
    'user',
    p_order_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Product accepted successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Function to reject a product in an order
CREATE OR REPLACE FUNCTION public.reject_product_in_order(
  p_order_id UUID,
  p_product_id UUID,
  p_seller_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_updated_items JSONB;
  v_item JSONB;
  v_has_accepted_items BOOLEAN := false;
BEGIN
  -- Get the order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Update the items array to mark this product as rejected
  v_updated_items := '[]'::jsonb;
  
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    IF (v_item->>'id')::UUID = p_product_id THEN
      -- Mark this item as rejected
      v_item := jsonb_set(v_item, '{status}', '"rejected"'::jsonb);
      v_item := jsonb_set(v_item, '{rejected_at}', to_jsonb(now()));
      v_item := jsonb_set(v_item, '{rejected_by}', to_jsonb(p_seller_id));
      
      IF p_reason IS NOT NULL THEN
        v_item := jsonb_set(v_item, '{rejection_reason}', to_jsonb(p_reason));
      END IF;
    ELSE
      -- Check if there are any accepted items
      IF v_item ? 'status' AND (v_item->>'status') = 'accepted' THEN
        v_has_accepted_items := true;
      END IF;
    END IF;
    
    v_updated_items := v_updated_items || v_item;
  END LOOP;
  
  -- Update the order with modified items
  UPDATE orders 
  SET 
    items = v_updated_items,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Create notification for customer
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    role,
    order_id
  ) VALUES (
    v_order.user_id,
    'Product Rejected',
    COALESCE(p_reason, 'A product in your order has been rejected by the seller'),
    'order_update',
    'user',
    p_order_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Product rejected successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;