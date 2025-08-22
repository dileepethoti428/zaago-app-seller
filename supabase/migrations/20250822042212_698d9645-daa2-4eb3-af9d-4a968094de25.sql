-- First, let's check if we have profiles table and create missing profiles for existing users
INSERT INTO profiles (user_id, full_name, email, approval_status)
SELECT DISTINCT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
  u.email,
  'approved'
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Now add seller_id column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES profiles(user_id);

-- Update seller_id to user_id for existing orders where seller_id is null
UPDATE orders SET seller_id = user_id WHERE seller_id IS NULL AND user_id IS NOT NULL;

-- Update existing orders with invalid statuses
UPDATE orders 
SET status = CASE 
  WHEN status = 'placed' THEN 'new'
  WHEN status = 'confirmed' THEN 'accepted'
  WHEN status NOT IN ('new', 'accepted', 'rejected', 'assigned', 'out_for_delivery', 'in_transit', 'delivered') THEN 'new'
  ELSE status
END;

-- Now add the constraint with updated valid statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('new', 'accepted', 'rejected', 'assigned', 'out_for_delivery', 'in_transit', 'delivered'));

-- Set default status to 'new' for seller workflow
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'new';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Enable realtime for orders table
ALTER TABLE orders REPLICA IDENTITY FULL;