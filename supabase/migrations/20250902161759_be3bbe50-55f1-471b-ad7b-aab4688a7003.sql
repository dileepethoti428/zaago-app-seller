-- Sync seller location from latest user_locations when products are created/updated
-- 1) Backfill current sellers with their most recent user location (if any)
UPDATE public.sellers s
SET 
  latitude = ul.latitude,
  longitude = ul.longitude,
  address = jsonb_build_object(
    'address', ul.address,
    'city', ul.city,
    'state', ul.state,
    'pincode', ul.pincode
  ),
  location_verified = COALESCE(s.location_verified, false) OR true,
  updated_at = now()
FROM LATERAL (
  SELECT latitude, longitude, address, city, state, pincode
  FROM public.user_locations
  WHERE user_id = s.user_id
  ORDER BY created_at DESC
  LIMIT 1
) ul
WHERE ul.latitude IS NOT NULL
  AND (s.latitude IS DISTINCT FROM ul.latitude OR s.longitude IS DISTINCT FROM ul.longitude);

-- 2) Create trigger function to keep sellers in sync going forward
CREATE OR REPLACE FUNCTION public.sync_seller_location_from_recent_user_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loc RECORD;
BEGIN
  -- Fetch the most recent user location for this seller
  SELECT ul.* INTO v_loc
  FROM public.user_locations ul
  WHERE ul.user_id = NEW.seller_id
  ORDER BY ul.created_at DESC
  LIMIT 1;

  -- If we have a recent location, update the seller record
  IF FOUND THEN
    UPDATE public.sellers s
    SET 
      latitude = v_loc.latitude,
      longitude = v_loc.longitude,
      address = jsonb_build_object(
        'address', v_loc.address,
        'city', v_loc.city,
        'state', v_loc.state,
        'pincode', v_loc.pincode
      ),
      location_verified = true,
      updated_at = now()
    WHERE s.user_id = NEW.seller_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Attach trigger to products table for inserts and updates
DROP TRIGGER IF EXISTS sync_seller_location_on_products_biu ON public.products;
CREATE TRIGGER sync_seller_location_on_products_biu
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_seller_location_from_recent_user_location();