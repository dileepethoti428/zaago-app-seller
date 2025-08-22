-- First, let's see what status values exist and update them to valid ones
UPDATE orders 
SET status = CASE 
  WHEN status = 'placed' THEN 'new'
  WHEN status = 'confirmed' THEN 'accepted'
  WHEN status NOT IN ('new', 'accepted', 'rejected', 'assigned', 'out_for_delivery', 'in_transit', 'delivered') THEN 'new'
  ELSE status
END;

-- Add seller_id column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES profiles(id);

-- Update seller_id to user_id for existing orders where seller_id is null
UPDATE orders SET seller_id = user_id WHERE seller_id IS NULL AND user_id IS NOT NULL;

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

-- Add orders table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE orders;