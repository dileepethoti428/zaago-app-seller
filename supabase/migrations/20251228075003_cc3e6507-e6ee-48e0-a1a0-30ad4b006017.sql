-- Create a function to ensure correct customer_id on customer_app subscriptions
CREATE OR REPLACE FUNCTION public.ensure_correct_subscription_customer()
RETURNS TRIGGER AS $$
DECLARE
  v_product_seller_id uuid;
  v_existing_customer_id uuid;
  v_new_customer_id uuid;
  v_customer_phone text;
  v_customer_name text;
  v_customer_email text;
BEGIN
  -- Only process customer_app subscriptions
  IF NEW.source != 'customer_app' THEN
    RETURN NEW;
  END IF;

  -- Get the product's seller_id
  SELECT seller_id INTO v_product_seller_id
  FROM products
  WHERE id = NEW.product_id;

  IF v_product_seller_id IS NULL THEN
    RAISE EXCEPTION 'Product not found for subscription';
  END IF;

  -- If no customer_id is set, we need to handle this
  IF NEW.customer_id IS NULL THEN
    -- Try to get customer info from profiles using user_id
    SELECT full_name, phone INTO v_customer_name, v_customer_phone
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    v_customer_email := NULL;
  ELSE
    -- Check if the existing customer belongs to the correct seller
    SELECT id, phone, full_name, email 
    INTO v_existing_customer_id, v_customer_phone, v_customer_name, v_customer_email
    FROM customers
    WHERE id = NEW.customer_id;

    -- Check if customer belongs to product's seller
    IF v_existing_customer_id IS NOT NULL THEN
      PERFORM 1 FROM customers 
      WHERE id = NEW.customer_id 
      AND seller_id = v_product_seller_id;
      
      IF FOUND THEN
        -- Customer already belongs to correct seller, no changes needed
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  -- Customer doesn't exist or belongs to wrong seller
  -- Find or create correct customer for this seller
  IF v_customer_phone IS NOT NULL AND v_customer_phone != '' THEN
    -- First try to find existing customer by phone for this seller
    SELECT id INTO v_new_customer_id
    FROM customers
    WHERE seller_id = v_product_seller_id
    AND phone = v_customer_phone
    LIMIT 1;

    IF v_new_customer_id IS NULL THEN
      -- Create new customer for this seller
      INSERT INTO customers (seller_id, full_name, phone, email)
      VALUES (
        v_product_seller_id,
        COALESCE(v_customer_name, 'Unknown Customer'),
        v_customer_phone,
        v_customer_email
      )
      RETURNING id INTO v_new_customer_id;
      
      RAISE NOTICE 'Created new customer % for seller %', v_new_customer_id, v_product_seller_id;
    END IF;

    NEW.customer_id := v_new_customer_id;
  ELSE
    -- No phone available, try to find by user_id through profiles
    SELECT c.id INTO v_new_customer_id
    FROM customers c
    JOIN profiles p ON c.phone = p.phone
    WHERE c.seller_id = v_product_seller_id
    AND p.user_id = NEW.user_id
    LIMIT 1;

    IF v_new_customer_id IS NOT NULL THEN
      NEW.customer_id := v_new_customer_id;
    ELSE
      -- Still no match, get profile info and create customer
      SELECT full_name, phone INTO v_customer_name, v_customer_phone
      FROM profiles
      WHERE user_id = NEW.user_id;

      IF v_customer_phone IS NOT NULL AND v_customer_phone != '' THEN
        INSERT INTO customers (seller_id, full_name, phone)
        VALUES (
          v_product_seller_id,
          COALESCE(v_customer_name, 'Unknown Customer'),
          v_customer_phone
        )
        RETURNING id INTO v_new_customer_id;

        NEW.customer_id := v_new_customer_id;
        RAISE NOTICE 'Created new customer from profile % for seller %', v_new_customer_id, v_product_seller_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_subscription_customer_trigger ON public.subscriptions;

-- Create trigger to run BEFORE INSERT
CREATE TRIGGER ensure_subscription_customer_trigger
BEFORE INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_correct_subscription_customer();

-- Add a comment explaining the trigger
COMMENT ON FUNCTION public.ensure_correct_subscription_customer() IS 
'Ensures that customer_app subscriptions are linked to a customer belonging to the correct seller (product owner). Creates a new customer if needed.';