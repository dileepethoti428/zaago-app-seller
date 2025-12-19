-- Drop the old constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new constraint with additional status values
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status = ANY (ARRAY[
    'pending', 'placed', 'confirmed', 'new',
    'accepted', 'accepted_by_seller', 'accepted_late',
    'rejected', 'packed', 'assigned', 'picked_up', 
    'out_for_delivery', 'in_transit', 'delivered', 
    'cancelled', 'returned', 'payment_pending',
    'skipped_by_seller'
  ])
);