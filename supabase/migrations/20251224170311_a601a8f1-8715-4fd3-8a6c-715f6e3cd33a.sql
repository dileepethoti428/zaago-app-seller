-- ============================================================================
-- SAFETY: Prevent primary agent from being changed once assigned
-- ============================================================================
-- This trigger ensures that once a primary_agent_id is set on a subscription,
-- it cannot be changed. This is a critical safety rule to maintain assignment
-- integrity and prevent sellers from overriding automated assignments.
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_primary_agent_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If primary_agent_id was already set and is being changed to a different value
  IF OLD.primary_agent_id IS NOT NULL 
     AND NEW.primary_agent_id IS DISTINCT FROM OLD.primary_agent_id THEN
    RAISE EXCEPTION 'Primary agent cannot be changed once assigned. Current agent: %', OLD.primary_agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_single_primary_agent ON subscriptions;

-- Create the trigger
CREATE TRIGGER enforce_single_primary_agent
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_primary_agent_change();

-- Add a comment explaining the safety rule
COMMENT ON TRIGGER enforce_single_primary_agent ON subscriptions IS 
  'SAFETY: Prevents primary_agent_id from being changed once set. Sellers can only assign primary agent once.';