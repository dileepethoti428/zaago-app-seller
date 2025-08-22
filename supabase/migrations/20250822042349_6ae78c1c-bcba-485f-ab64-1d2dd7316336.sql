-- Let's work with the actual profiles table structure
-- First, ensure we have profiles for existing users
INSERT INTO profiles (user_id, full_name, approval_status)
SELECT DISTINCT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
  'approved'
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Now let's safely add seller_id column and update orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id uuid;

-- Update seller_id to user_id for existing orders where seller_id is null
UPDATE orders SET seller_id = user_id WHERE seller_id IS NULL AND user_id IS NOT NULL;

-- Update existing orders with invalid statuses to valid ones
UPDATE orders 
SET status = CASE 
  WHEN status = 'placed' THEN 'new'
  WHEN status = 'confirmed' THEN 'accepted'
  WHEN status = 'delivered' THEN 'delivered'
  WHEN status = 'out_for_delivery' THEN 'out_for_delivery'
  WHEN status = 'assigned' THEN 'assigned'
  WHEN status NOT IN ('new', 'accepted', 'rejected', 'assigned', 'out_for_delivery', 'in_transit', 'delivered') THEN 'new'
  ELSE status
END;

-- Now add the constraint with valid statuses
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

-- Add orders table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE orders;