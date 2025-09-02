-- Fix seller location sync by updating sellers with their actual locations from user_locations
-- 1) First, update sellers with their most recent user location data  
UPDATE public.sellers 
SET 
  latitude = ul.latitude,
  longitude = ul.longitude,
  address = jsonb_build_object(
    'address', ul.address,
    'city', ul.city,
    'state', ul.state,
    'pincode', ul.pincode
  ),
  location_verified = true,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (user_id) 
    user_id, latitude, longitude, address, city, state, pincode
  FROM public.user_locations
  ORDER BY user_id, created_at DESC
) ul
WHERE sellers.user_id = ul.user_id
  AND ul.latitude IS NOT NULL
  AND (sellers.latitude IS DISTINCT FROM ul.latitude OR sellers.longitude IS DISTINCT FROM ul.longitude);

-- 2) Create function to auto-sync seller location when products are added/updated
CREATE OR REPLACE FUNCTION public.sync_seller_location_from_user_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location RECORD;
BEGIN
  -- Get the most recent location for this seller
  SELECT * INTO v_location
  FROM public.user_locations
  WHERE user_id = NEW.seller_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If we found a location, update the seller record
  IF FOUND THEN
    UPDATE public.sellers
    SET 
      latitude = v_location.latitude,
      longitude = v_location.longitude,
      address = jsonb_build_object(
        'address', v_location.address,
        'city', v_location.city,
        'state', v_location.state,
        'pincode', v_location.pincode
      ),
      location_verified = true,
      updated_at = now()
    WHERE user_id = NEW.seller_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Create trigger on products table
DROP TRIGGER IF EXISTS sync_seller_location_trigger ON public.products;
CREATE TRIGGER sync_seller_location_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_seller_location_from_user_location();