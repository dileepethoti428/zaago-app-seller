-- Ensure orders table has proper structure for seller workflow
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES profiles(id);

-- Update the status check constraint to include all required statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('new', 'placed', 'confirmed', 'accepted', 'rejected', 'assigned', 'out_for_delivery', 'in_transit', 'delivered'));

-- Set default status to 'new' for seller workflow
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'new';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Enable realtime for orders table
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Add orders table to realtime publication if not already added
DO $$
BEGIN
  -- Check if the table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

-- Create a function to automatically assign seller_id based on order items
CREATE OR REPLACE FUNCTION assign_seller_to_order()
RETURNS TRIGGER AS $$
BEGIN
  -- If seller_id is not set and we have items, try to assign based on products
  IF NEW.seller_id IS NULL AND NEW.items IS NOT NULL THEN
    -- For now, assign to user_id if it exists (seller creating their own order)
    IF NEW.user_id IS NOT NULL THEN
      NEW.seller_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign seller
DROP TRIGGER IF EXISTS trigger_assign_seller_to_order ON orders;
CREATE TRIGGER trigger_assign_seller_to_order
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_seller_to_order();