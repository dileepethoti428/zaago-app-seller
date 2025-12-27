-- ============================================================================
-- RPC Function: seller_set_subscription_agent
-- Allows sellers to change/remove primary agent for their subscriptions
-- Bypasses the existing trigger that blocks agent changes
-- ============================================================================

-- First, update the trigger function to allow changes when bypass flag is set
CREATE OR REPLACE FUNCTION public.prevent_primary_agent_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow changes if bypass flag is set (for seller RPC calls)
  IF current_setting('app.allow_primary_agent_change', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Prevent changes to primary_agent_id once set (original logic)
  IF OLD.primary_agent_id IS NOT NULL AND 
     (NEW.primary_agent_id IS DISTINCT FROM OLD.primary_agent_id) THEN
    RAISE EXCEPTION 'Primary agent cannot be changed once assigned. Use seller_set_subscription_agent() to change agents.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the RPC function for sellers to set/remove agents
CREATE OR REPLACE FUNCTION public.seller_set_subscription_agent(
  p_subscription_id uuid,
  p_agent_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_subscription_exists boolean;
BEGIN
  -- Get the calling user's ID
  v_seller_id := auth.uid();
  
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify the subscription belongs to a product owned by this seller
  SELECT EXISTS (
    SELECT 1 
    FROM subscriptions s
    JOIN products p ON s.product_id = p.id
    WHERE s.id = p_subscription_id 
    AND p.seller_id = v_seller_id
  ) INTO v_subscription_exists;

  IF NOT v_subscription_exists THEN
    RAISE EXCEPTION 'Subscription not found or you do not have permission to modify it';
  END IF;

  -- Set bypass flag temporarily (only for this transaction)
  PERFORM set_config('app.allow_primary_agent_change', 'on', true);

  -- Update the subscription
  UPDATE subscriptions
  SET 
    primary_agent_id = p_agent_id,
    last_assigned_agent_id = p_agent_id
  WHERE id = p_subscription_id;

  RETURN json_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'agent_id', p_agent_id,
    'action', CASE WHEN p_agent_id IS NULL THEN 'removed' ELSE 'assigned' END
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.seller_set_subscription_agent(uuid, uuid) TO authenticated;