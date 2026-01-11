-- Create vacation_compensations table for manual seller-assigned extra deliveries
CREATE TABLE public.vacation_compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  vacation_period_id UUID NOT NULL REFERENCES public.subscription_vacation_periods(id) ON DELETE CASCADE,
  original_vacation_date DATE NOT NULL,
  compensation_delivery_date DATE NOT NULL,
  seller_id UUID NOT NULL,
  assigned_agent_id UUID REFERENCES public.delivery_agents(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate compensations per vacation day
  CONSTRAINT unique_vacation_compensation UNIQUE(subscription_id, original_vacation_date)
);

-- Enable RLS
ALTER TABLE public.vacation_compensations ENABLE ROW LEVEL SECURITY;

-- Sellers can view compensations for their subscriptions (via product ownership)
CREATE POLICY "Sellers can view their subscription compensations"
ON public.vacation_compensations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.products p ON s.product_id = p.id
    WHERE s.id = vacation_compensations.subscription_id
    AND p.seller_id = auth.uid()
  )
);

-- Sellers can create compensations for their subscriptions
CREATE POLICY "Sellers can create compensations for their subscriptions"
ON public.vacation_compensations
FOR INSERT
WITH CHECK (
  seller_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.products p ON s.product_id = p.id
    WHERE s.id = vacation_compensations.subscription_id
    AND p.seller_id = auth.uid()
  )
);

-- Sellers can update their own compensations
CREATE POLICY "Sellers can update their compensations"
ON public.vacation_compensations
FOR UPDATE
USING (seller_id = auth.uid());

-- Delivery agents can view their assigned compensations
CREATE POLICY "Agents can view their assigned compensations"
ON public.vacation_compensations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_agents da
    WHERE da.id = vacation_compensations.assigned_agent_id
    AND da.agent_id = auth.uid()
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_vacation_compensations_updated_at
BEFORE UPDATE ON public.vacation_compensations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_vacation_compensations_subscription ON public.vacation_compensations(subscription_id);
CREATE INDEX idx_vacation_compensations_agent ON public.vacation_compensations(assigned_agent_id);
CREATE INDEX idx_vacation_compensations_date ON public.vacation_compensations(compensation_delivery_date);