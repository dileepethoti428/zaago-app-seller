
## Problem
The `get_seller_subscription_handover_data` SQL function doesn't filter out customers who are currently on vacation. It shows all `pending`/`confirmed` daily orders for the handover date, including those where the subscription is in an active vacation period.

## Fix
Add a `LEFT JOIN` to `subscription_vacation_periods` in the SQL function and exclude rows where the handover date falls within an active vacation period.

### New migration: Update `get_seller_subscription_handover_data`

Add this condition to the WHERE clause:
```sql
-- Exclude orders where the subscription is on vacation for the handover date
AND NOT EXISTS (
  SELECT 1 FROM subscription_vacation_periods svp
  WHERE svp.subscription_id = s.id
    AND svp.status = 'active'
    AND handover_date BETWEEN svp.start_date AND svp.end_date
)
```

This is a minimal, targeted fix — just one migration file to update the existing DB function. No frontend changes needed.
