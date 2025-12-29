-- Create seller_restock_list table for tracking purchase list items
CREATE TABLE public.seller_restock_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  suggested_quantity NUMERIC NOT NULL,
  notes TEXT,
  is_purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seller_id, product_id)
);

-- Enable RLS
ALTER TABLE public.seller_restock_list ENABLE ROW LEVEL SECURITY;

-- Seller can only see their own restock list
CREATE POLICY "Sellers can view own restock list"
  ON public.seller_restock_list FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can insert own restock list"
  ON public.seller_restock_list FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update own restock list"
  ON public.seller_restock_list FOR UPDATE
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can delete own restock list"
  ON public.seller_restock_list FOR DELETE
  USING (seller_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_seller_restock_list_updated_at
BEFORE UPDATE ON public.seller_restock_list
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();