-- Add function to check if seller has products
CREATE OR REPLACE FUNCTION check_seller_has_products(seller_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE seller_id = seller_user_id;
  
  RETURN product_count > 0;
END;
$$;

-- Update the update_seller_location_from_current function to prevent updates if seller has products
CREATE OR REPLACE FUNCTION public.update_seller_location_from_current(
  seller_user_id UUID, 
  current_lat NUMERIC, 
  current_lng NUMERIC, 
  current_address JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  has_products BOOLEAN;
BEGIN
  -- Check if seller already has products (location should be locked)
  SELECT check_seller_has_products(seller_user_id) INTO has_products;
  
  IF has_products THEN
    RAISE EXCEPTION 'Cannot update location: Seller already has products. Location is locked after first product addition.';
  END IF;
  
  -- Update seller location with current coordinates
  UPDATE sellers 
  SET 
    latitude = current_lat,
    longitude = current_lng,
    address = COALESCE(current_address, address),
    location_verified = TRUE,
    updated_at = now()
  WHERE user_id = seller_user_id;
  
  -- Return true if update was successful
  RETURN FOUND;
END;
$$;