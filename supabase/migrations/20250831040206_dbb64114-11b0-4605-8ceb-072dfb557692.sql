-- Create product variants table to support flexible options like half litre, half kg
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL, -- e.g., "Half Litre", "Half Kg", "Quarter Kg"
  variant_value TEXT NOT NULL, -- e.g., "500ml", "500g", "250g"
  price_adjustment NUMERIC DEFAULT 0, -- Price difference from base product
  stock_quantity INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on product variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Create policies for product variants
CREATE POLICY "Anyone can view active product variants"
ON public.product_variants
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage all product variants"
ON public.product_variants
FOR ALL
USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

CREATE POLICY "Sellers can manage their own product variants"
ON public.product_variants
FOR ALL
USING (
  product_id IN (
    SELECT id FROM public.products 
    WHERE seller_id = auth.uid()
  )
)
WITH CHECK (
  product_id IN (
    SELECT id FROM public.products 
    WHERE seller_id = auth.uid()
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_product_variants_updated_at();

-- Create index for better performance
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_active ON public.product_variants(is_active);

-- Add some common predefined variant types
CREATE TABLE public.variant_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL, -- e.g., "dairy", "grocery", "beverages"
  template_name TEXT NOT NULL, -- e.g., "Half Litre", "Quarter Kg"
  template_value TEXT NOT NULL, -- e.g., "500ml", "250g"
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on variant templates
ALTER TABLE public.variant_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for variant templates
CREATE POLICY "Anyone can view active variant templates"
ON public.variant_templates
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage all variant templates"
ON public.variant_templates
FOR ALL
USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

-- Insert common variant templates
INSERT INTO public.variant_templates (category_name, template_name, template_value, sort_order) VALUES
-- Dairy and liquid products
('dairy', 'Quarter Litre', '250ml', 1),
('dairy', 'Half Litre', '500ml', 2),
('dairy', 'Three Quarter Litre', '750ml', 3),
('dairy', 'Full Litre', '1L', 4),
('beverages', 'Quarter Litre', '250ml', 1),
('beverages', 'Half Litre', '500ml', 2),
('beverages', 'Three Quarter Litre', '750ml', 3),
('beverages', 'Full Litre', '1L', 4),
-- Solid/weight-based products
('grocery', 'Quarter Kg', '250g', 1),
('grocery', 'Half Kg', '500g', 2),
('grocery', 'Three Quarter Kg', '750g', 3),
('grocery', 'Full Kg', '1kg', 4),
('food', 'Quarter Kg', '250g', 1),
('food', 'Half Kg', '500g', 2),
('food', 'Three Quarter Kg', '750g', 3),
('food', 'Full Kg', '1kg', 4),
-- General/piece-based products
('general', 'Single Piece', '1 piece', 1),
('general', 'Pack of 2', '2 pieces', 2),
('general', 'Pack of 4', '4 pieces', 3),
('general', 'Pack of 6', '6 pieces', 4),
('general', 'Pack of 12', '12 pieces', 5);