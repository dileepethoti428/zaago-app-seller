
-- Create cod_settlements table
CREATE TABLE public.cod_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  agent_id UUID NOT NULL REFERENCES public.delivery_agents(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'disputed')),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE public.cod_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own settlements"
  ON public.cod_settlements FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can update own settlements"
  ON public.cod_settlements FOR UPDATE TO authenticated
  USING (seller_id = auth.uid());

-- Trigger function: auto-create settlement when COD order is delivered
CREATE OR REPLACE FUNCTION public.auto_create_cod_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered'
    AND (OLD.status IS DISTINCT FROM 'delivered')
    AND NEW.payment_method = 'COD'
    AND NEW.delivery_agent_id IS NOT NULL
    AND NEW.seller_id IS NOT NULL
  THEN
    INSERT INTO public.cod_settlements (order_id, agent_id, seller_id, amount)
    VALUES (NEW.id, NEW.delivery_agent_id, NEW.seller_id, NEW.total_amount)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_cod_settlement
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_cod_settlement();
