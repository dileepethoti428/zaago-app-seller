-- Create function to get seller orders (orders containing seller's products)
CREATE OR REPLACE FUNCTION public.get_seller_orders(seller_user_id UUID, status_filter TEXT[] DEFAULT NULL)
RETURNS TABLE(
  order_id UUID,
  user_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  address JSONB,
  items JSONB,
  total NUMERIC,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  delivery_date DATE,
  agent_id UUID,
  delivered BOOLEAN,
  payment_status TEXT,
  special_instructions TEXT,
  seller_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
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
    -- Calculate seller's portion of the order total
    (
      SELECT COALESCE(SUM((item->>'quantity')::INTEGER * (item->>'price')::NUMERIC), 0)
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

-- Create function to get seller stats
CREATE OR REPLACE FUNCTION public.get_seller_stats(seller_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  total_products_count INTEGER;
  active_orders_count INTEGER;
  total_deliveries_count INTEGER;
  total_revenue_amount NUMERIC;
  today_orders_count INTEGER;
  today_revenue_amount NUMERIC;
  week_orders_count INTEGER;
  week_revenue_amount NUMERIC;
  month_orders_count INTEGER;
  month_revenue_amount NUMERIC;
BEGIN
  -- Total products count
  SELECT COUNT(*) INTO total_products_count
  FROM products 
  WHERE seller_id = seller_user_id AND is_active = true;
  
  -- Active orders count (orders with seller's products)
  SELECT COUNT(DISTINCT o.id) INTO active_orders_count
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND o.status IN ('placed', 'confirmed', 'assigned', 'out_for_delivery');
  
  -- Total deliveries count
  SELECT COUNT(DISTINCT o.id) INTO total_deliveries_count
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND o.status = 'delivered';
  
  -- Total revenue
  SELECT COALESCE(SUM(
    (SELECT COALESCE(SUM((item->>'quantity')::INTEGER * (item->>'price')::NUMERIC), 0)
     FROM jsonb_array_elements(o.items) AS item
     WHERE (item->>'id')::UUID IN (
       SELECT p.id FROM products p WHERE p.seller_id = seller_user_id
     ))
  ), 0) INTO total_revenue_amount
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND o.status = 'delivered';
  
  -- Today's stats
  SELECT 
    COUNT(DISTINCT o.id),
    COALESCE(SUM(
      (SELECT COALESCE(SUM((item->>'quantity')::INTEGER * (item->>'price')::NUMERIC), 0)
       FROM jsonb_array_elements(o.items) AS item
       WHERE (item->>'id')::UUID IN (
         SELECT p.id FROM products p WHERE p.seller_id = seller_user_id
       ))
    ), 0)
  INTO today_orders_count, today_revenue_amount
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND DATE(o.created_at) = CURRENT_DATE;
  
  -- This week's stats
  SELECT 
    COUNT(DISTINCT o.id),
    COALESCE(SUM(
      (SELECT COALESCE(SUM((item->>'quantity')::INTEGER * (item->>'price')::NUMERIC), 0)
       FROM jsonb_array_elements(o.items) AS item
       WHERE (item->>'id')::UUID IN (
         SELECT p.id FROM products p WHERE p.seller_id = seller_user_id
       ))
    ), 0)
  INTO week_orders_count, week_revenue_amount
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND o.created_at >= DATE_TRUNC('week', CURRENT_DATE);
  
  -- This month's stats
  SELECT 
    COUNT(DISTINCT o.id),
    COALESCE(SUM(
      (SELECT COALESCE(SUM((item->>'quantity')::INTEGER * (item->>'price')::NUMERIC), 0)
       FROM jsonb_array_elements(o.items) AS item
       WHERE (item->>'id')::UUID IN (
         SELECT p.id FROM products p WHERE p.seller_id = seller_user_id
       ))
    ), 0)
  INTO month_orders_count, month_revenue_amount
  FROM orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE p.seller_id = seller_user_id
  )
  AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE);
  
  result := jsonb_build_object(
    'total_products', total_products_count,
    'active_orders', active_orders_count,
    'total_deliveries', total_deliveries_count,
    'total_revenue', total_revenue_amount,
    'today_orders', today_orders_count,
    'today_revenue', today_revenue_amount,
    'week_orders', week_orders_count,
    'week_revenue', week_revenue_amount,
    'month_orders', month_orders_count,
    'month_revenue', month_revenue_amount
  );
  
  RETURN result;
END;
$$;