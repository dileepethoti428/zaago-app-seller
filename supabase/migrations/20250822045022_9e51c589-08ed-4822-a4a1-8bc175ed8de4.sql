-- Create commission config table for admin control
CREATE TABLE IF NOT EXISTS commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate NUMERIC NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  commission_rate NUMERIC NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount NUMERIC NOT NULL CHECK (commission_amount >= 0),
  net_amount NUMERIC NOT NULL CHECK (net_amount >= 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed')) DEFAULT 'pending',
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE commission_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for commission_config
CREATE POLICY "Admins can manage commission config" ON commission_config
FOR ALL USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

CREATE POLICY "Anyone can view current commission rate" ON commission_config
FOR SELECT USING (true);

-- RLS policies for payouts
CREATE POLICY "Admins can manage all payouts" ON payouts
FOR ALL USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

CREATE POLICY "Sellers can view their own payouts" ON payouts
FOR SELECT USING (auth.uid() = seller_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_config_effective_from ON commission_config(effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_seller_id ON payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_commission_config_updated_at
  BEFORE UPDATE ON commission_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default commission rate
INSERT INTO commission_config (commission_rate) VALUES (10)
ON CONFLICT DO NOTHING;