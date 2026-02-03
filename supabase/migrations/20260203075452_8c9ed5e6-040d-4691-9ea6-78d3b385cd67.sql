-- Create handover confirmations table
CREATE TABLE public.agent_handover_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  handover_date DATE NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, agent_id, handover_date)
);

-- Add foreign key to delivery_agents using agent_id column
ALTER TABLE public.agent_handover_confirmations
  ADD CONSTRAINT agent_handover_confirmations_agent_id_fkey
  FOREIGN KEY (agent_id) REFERENCES delivery_agents(agent_id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.agent_handover_confirmations ENABLE ROW LEVEL SECURITY;

-- Policies: Sellers can manage their own confirmations
CREATE POLICY "Sellers can view own handover confirmations"
  ON public.agent_handover_confirmations FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert own handover confirmations"  
  ON public.agent_handover_confirmations FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own handover confirmations"
  ON public.agent_handover_confirmations FOR DELETE
  USING (auth.uid() = seller_id);

-- Create index for faster lookups
CREATE INDEX idx_handover_confirmations_lookup 
  ON public.agent_handover_confirmations(seller_id, handover_date);