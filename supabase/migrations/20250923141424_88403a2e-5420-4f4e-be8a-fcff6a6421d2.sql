-- Ensure orders table is added to realtime publication for real-time updates
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Ensure agent_notifications table is added to realtime publication
ALTER TABLE agent_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_notifications;