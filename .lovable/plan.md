
# Fix: Subscription Handover Without Edge Functions

## Root Cause Understanding
The current handover relies on `daily_orders` records being pre-created by the `process-daily-subscriptions` edge function. Since you've hit the edge function limit and can't redeploy, the approach changes entirely:

**New approach**: Query the `subscriptions` table directly — no edge functions needed at all.

## What Changes

### 1. New Database RPC: `get_seller_subscription_handover_direct`
A single SQL function that computes the handover list directly from `subscriptions` for any given date:

```sql
SELECT subscriptions
WHERE next_delivery_date = target_date
  AND is_active = true
JOIN products (seller filter)
JOIN delivery_agents via primary_agent_id (subscriptions.primary_agent_id = delivery_agents.id)
WHERE NOT IN active vacation for that date
GROUP BY agent + product → SUM quantities, COUNT orders
```

Key details:
- `subscriptions.primary_agent_id` = `delivery_agents.id` (confirmed from data)
- Vacation filter: `NOT EXISTS (SELECT 1 FROM subscription_vacation_periods WHERE subscription_id = s.id AND status = 'active' AND target_date BETWEEN start_date AND end_date)`
- Also handles subscriptions with `last_assigned_agent_id` as fallback when `primary_agent_id` is null

### 2. Update `useSubscriptionHandover` Hook
Switch from calling `get_seller_subscription_handover_data` (RPC based on `daily_orders`) to the new `get_seller_subscription_handover_direct` (RPC based on `subscriptions` directly).

The hook interface stays identical — no UI changes needed.

### 3. Realtime Updates
Update the realtime subscription in the hook to listen to `subscriptions` table changes (instead of `daily_orders`) since the new RPC queries subscriptions directly.

## Files Changed
- **New DB migration** — creates `get_seller_subscription_handover_direct` SQL function
- **`src/hooks/useSubscriptionHandover.ts`** — swap RPC call name

## No UI Changes
The `SubscriptionHandoverCard`, `AgentHandoverCard`, and `HandoverConfirmDialog` components remain unchanged.

## SQL Preview
```sql
CREATE OR REPLACE FUNCTION get_seller_subscription_handover_direct(
  seller_user_id UUID,
  handover_date DATE
)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(da_primary.agent_id, da_last.agent_id) AS agent_id,
    COALESCE(da_primary.name, da_last.name) AS agent_name,
    ...
    COUNT(DISTINCT s.id) AS total_orders,
    p.id, p.name, p.unit, p.image_url,
    SUM(s.quantity) AS total_quantity
  FROM subscriptions s
  JOIN products p ON s.product_id = p.id
  LEFT JOIN delivery_agents da_primary ON da_primary.id = s.primary_agent_id
  LEFT JOIN delivery_agents da_last ON da_last.id = s.last_assigned_agent_id
  WHERE s.is_active = true
    AND s.next_delivery_date = handover_date
    AND p.seller_id = seller_user_id
    AND COALESCE(da_primary.id, da_last.id) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM subscription_vacation_periods svp
      WHERE svp.subscription_id = s.id
        AND svp.status = 'active'
        AND handover_date BETWEEN svp.start_date AND svp.end_date
    )
  GROUP BY agent_id, agent_name, ..., p.id, p.name, p.unit, p.image_url
  ORDER BY agent_name, p.name;
END;
$$;
```
