
-- Fix trigger to use case-insensitive comparison
CREATE OR REPLACE FUNCTION auto_create_cod_settlement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'delivered'
    AND (OLD.status IS DISTINCT FROM 'delivered')
    AND LOWER(NEW.payment_method) = 'cod'
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

-- Backfill existing delivered COD orders
INSERT INTO public.cod_settlements (order_id, agent_id, seller_id, amount)
SELECT id, agent_id, seller_id, total
FROM public.orders
WHERE LOWER(payment_method) = 'cod'
  AND status = 'delivered'
  AND agent_id IS NOT NULL
  AND seller_id IS NOT NULL
ON CONFLICT (order_id) DO NOTHING;
