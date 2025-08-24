-- Create user_locations table to store real-time locations
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own location" 
ON public.user_locations 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can view customer locations for distance calculation" 
ON public.user_locations 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'seller'
  )
);

CREATE POLICY "Admins can view all locations" 
ON public.user_locations 
FOR SELECT
USING (is_current_user_admin_v2());

-- Create function to calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 NUMERIC, 
  lon1 NUMERIC, 
  lat2 NUMERIC, 
  lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  R CONSTANT NUMERIC := 6371; -- Earth's radius in kilometers
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  -- Convert latitude and longitude from degrees to radians
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  -- Haversine formula
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  -- Distance in kilometers
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Create function to get products within range for a customer
CREATE OR REPLACE FUNCTION public.get_products_within_range(
  customer_lat NUMERIC,
  customer_lon NUMERIC,
  range_km NUMERIC DEFAULT 15
) RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  product_description TEXT,
  product_price NUMERIC,
  product_image_url TEXT,
  stock_quantity INTEGER,
  seller_id UUID,
  seller_location JSONB,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.image_url as product_image_url,
    p.stock_quantity,
    p.seller_id,
    jsonb_build_object(
      'latitude', ul.latitude,
      'longitude', ul.longitude,
      'address', ul.address,
      'city', ul.city
    ) as seller_location,
    public.calculate_distance(customer_lat, customer_lon, ul.latitude, ul.longitude) as distance_km
  FROM products p
  JOIN user_locations ul ON ul.user_id = p.seller_id
  WHERE p.is_active = true 
    AND p.stock_quantity > 0
    AND public.calculate_distance(customer_lat, customer_lon, ul.latitude, ul.longitude) <= range_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update user_locations timestamp
CREATE OR REPLACE FUNCTION public.update_user_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_location_timestamp
  BEFORE UPDATE ON public.user_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_location_timestamp();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_coordinates ON public.user_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_products_seller_active ON public.products(seller_id, is_active, stock_quantity);