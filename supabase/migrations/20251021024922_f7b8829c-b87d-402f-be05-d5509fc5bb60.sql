-- Add missing assigned_agent_id column to orders table if it doesn't exist
-- This column is needed for some order assignment functions

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'assigned_agent_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN assigned_agent_id uuid REFERENCES delivery_agents(id);
    
    -- Create an index for better query performance
    CREATE INDEX IF NOT EXISTS idx_orders_assigned_agent_id ON public.orders(assigned_agent_id);
    
    COMMENT ON COLUMN public.orders.assigned_agent_id IS 'ID of the delivery agent assigned to this order (distinct from agent_id which may be used differently)';
  END IF;
END $$;