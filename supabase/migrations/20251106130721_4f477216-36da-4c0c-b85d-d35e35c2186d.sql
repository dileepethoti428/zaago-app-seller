-- Fix seller location to correct address
UPDATE sellers 
SET 
  latitude = 31.2519,
  longitude = 75.7033,
  address = '{"address": "Bh-1, LPU Open Audi Rd, Punjab 144411, India", "city": "Phagwara", "state": "Punjab", "pincode": "144411"}'::jsonb,
  location_verified = true
WHERE user_id = '0f8c8869-aa44-405e-962e-8ff3cc0487bb';