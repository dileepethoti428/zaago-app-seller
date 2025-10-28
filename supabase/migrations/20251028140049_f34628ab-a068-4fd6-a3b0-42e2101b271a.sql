-- Create seller_product_suggestion_status table for individual seller management
CREATE TABLE seller_product_suggestion_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES product_suggestions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reviewed')),
  seller_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seller_id, suggestion_id)
);

-- Create indexes for performance
CREATE INDEX idx_seller_suggestion_status_seller ON seller_product_suggestion_status(seller_id);
CREATE INDEX idx_seller_suggestion_status_suggestion ON seller_product_suggestion_status(suggestion_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_seller_product_suggestion_status_updated_at
  BEFORE UPDATE ON seller_product_suggestion_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE seller_product_suggestion_status ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own statuses
CREATE POLICY "Sellers can view own suggestion statuses"
ON seller_product_suggestion_status FOR SELECT
USING (
  seller_id IN (
    SELECT id FROM sellers WHERE user_id = auth.uid()
  )
);

-- Sellers can insert their own statuses
CREATE POLICY "Sellers can insert own suggestion statuses"
ON seller_product_suggestion_status FOR INSERT
WITH CHECK (
  seller_id IN (
    SELECT id FROM sellers WHERE user_id = auth.uid()
  )
);

-- Sellers can update their own statuses
CREATE POLICY "Sellers can update own suggestion statuses"
ON seller_product_suggestion_status FOR UPDATE
USING (
  seller_id IN (
    SELECT id FROM sellers WHERE user_id = auth.uid()
  )
);

-- Admins can view all statuses
CREATE POLICY "Admins can view all suggestion statuses"
ON seller_product_suggestion_status FOR SELECT
USING (is_current_user_admin_v2());

-- Admins can manage all statuses
CREATE POLICY "Admins can manage all suggestion statuses"
ON seller_product_suggestion_status FOR ALL
USING (is_current_user_admin_v2());