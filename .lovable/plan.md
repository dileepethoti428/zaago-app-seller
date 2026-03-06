

# Fix: "Accept Order" Fails Due to Wrong Column Names in COD Settlement Trigger

## Root Cause

The `auto_create_cod_settlement` trigger function (created in the COD Settlements migration) references **two column names that don't exist** in the `orders` table:

- `NEW.delivery_agent_id` — actual column is `agent_id`
- `NEW.total_amount` — actual column is `total`

PostgreSQL evaluates `NEW.delivery_agent_id` even before checking the IF condition, causing the error **`record "new" has no field "delivery_agent_id"`** on EVERY order update — not just delivered ones. This is why "Accept Order" fails.

The Supabase database logs confirm this error is happening repeatedly.

## Fix

One migration to replace the trigger function with corrected column names:

```sql
CREATE OR REPLACE FUNCTION auto_create_cod_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'delivered'
    AND (OLD.status IS DISTINCT FROM 'delivered')
    AND NEW.payment_method = 'COD'
    AND NEW.agent_id IS NOT NULL
    AND NEW.seller_id IS NOT NULL
  THEN
    INSERT INTO public.cod_settlements (order_id, agent_id, seller_id, amount)
    VALUES (NEW.id, NEW.agent_id, NEW.seller_id, NEW.total)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
```

Changes:
- `NEW.delivery_agent_id` → `NEW.agent_id`
- `NEW.total_amount` → `NEW.total`

No frontend changes needed.

