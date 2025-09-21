-- Update agent_notifications table constraint to include 'new_delivery_assignment' type
ALTER TABLE agent_notifications DROP CONSTRAINT IF EXISTS agent_notifications_type_check;

-- Add updated check constraint with the new notification type
ALTER TABLE agent_notifications ADD CONSTRAINT agent_notifications_type_check 
CHECK (type IN ('status_update', 'payout', 'info', 'order_assigned', 'new_order', 'new_delivery_assignment'));