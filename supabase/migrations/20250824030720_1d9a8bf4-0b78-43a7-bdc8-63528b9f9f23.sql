-- Add category column to products table for direct category storage
ALTER TABLE public.products ADD COLUMN category text;

-- Update existing categories table with predefined categories
INSERT INTO public.categories (name, description, is_active, sort_order) VALUES
('food', 'Food items and consumables', true, 1),
('grocery', 'General grocery items', true, 2),
('frequently_bought', 'Frequently purchased items', true, 3),
('previously_bought', 'Previously purchased items', true, 4),
('fresh_milk_dairy', 'Fresh milk and dairy products', true, 5),
('grocery_kitchen', 'Grocery and kitchen essentials', true, 6),
('beauty_personal_care', 'Beauty and personal care products', true, 7),
('household_essentials', 'Household essential items', true, 8)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;