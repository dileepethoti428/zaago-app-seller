-- Add business fields to sellers table
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_description TEXT;