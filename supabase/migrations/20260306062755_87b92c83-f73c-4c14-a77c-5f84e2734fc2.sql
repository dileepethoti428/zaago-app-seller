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