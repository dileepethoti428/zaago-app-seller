-- Create function to update seller location based on their current location
CREATE OR REPLACE FUNCTION public.update_seller_location_from_current(seller_user_id UUID, current_lat NUMERIC, current_lng NUMERIC, current_address JSONB DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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

-- Create trigger function to automatically update seller location when adding/editing products
CREATE OR REPLACE FUNCTION public.auto_update_seller_location_on_product_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seller_location_verified BOOLEAN;
BEGIN
  -- Check if seller's location is verified
  SELECT location_verified INTO seller_location_verified
  FROM sellers 
  WHERE user_id = NEW.seller_id;
  
  -- If location is not verified, we should prompt for location update
  -- This will be handled on the frontend by checking location_verified status
  
  RETURN NEW;
END;
$$;