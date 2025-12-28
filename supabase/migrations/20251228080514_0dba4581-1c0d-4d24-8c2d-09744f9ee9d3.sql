-- Update the function to ensure correct customer_id with NAME matching
CREATE OR REPLACE FUNCTION public.ensure_correct_subscription_customer()
RETURNS TRIGGER AS $$
DECLARE
  v_product_seller_id uuid;
  v_existing_customer_id uuid;
  v_new_customer_id uuid;
  v_profile_phone text;
  v_profile_name text;
  v_profile_email text;
  v_customer_matches boolean := false;
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

  -- Get profile info for the user creating the subscription
  SELECT full_name, phone, email 
  INTO v_profile_name, v_profile_phone, v_profile_email
  FROM profiles
  WHERE user_id = NEW.user_id;

  RAISE NOTICE 'Profile info: name=%, phone=%, email=%', v_profile_name, v_profile_phone, v_profile_email;

  -- If customer_id is provided, check if it matches BOTH seller AND name
  IF NEW.customer_id IS NOT NULL THEN
    SELECT id INTO v_existing_customer_id
    FROM customers
    WHERE id = NEW.customer_id
    AND seller_id = v_product_seller_id
    AND (
      -- Match by name (case insensitive)
      LOWER(TRIM(full_name)) = LOWER(TRIM(v_profile_name))
      OR 
      -- Or if profile name is null, accept any match
      v_profile_name IS NULL
    );

    IF v_existing_customer_id IS NOT NULL THEN
      -- Customer belongs to correct seller AND name matches
      RAISE NOTICE 'Existing customer % matches seller and name', v_existing_customer_id;
      RETURN NEW;
    ELSE
      RAISE NOTICE 'Customer % does not match seller or name mismatch', NEW.customer_id;
    END IF;
  END IF;

  -- Need to find or create the correct customer
  -- First, try to find customer by seller + phone + name
  IF v_profile_phone IS NOT NULL AND v_profile_phone != '' THEN
    SELECT id INTO v_new_customer_id
    FROM customers
    WHERE seller_id = v_product_seller_id
    AND phone = v_profile_phone
    AND LOWER(TRIM(full_name)) = LOWER(TRIM(v_profile_name))
    LIMIT 1;

    IF v_new_customer_id IS NOT NULL THEN
      RAISE NOTICE 'Found matching customer by phone+name: %', v_new_customer_id;
      NEW.customer_id := v_new_customer_id;
      RETURN NEW;
    END IF;

    -- No exact match found, create new customer for this seller with correct name
    INSERT INTO customers (seller_id, full_name, phone, email)
    VALUES (
      v_product_seller_id,
      COALESCE(v_profile_name, 'Unknown Customer'),
      v_profile_phone,
      v_profile_email
    )
    RETURNING id INTO v_new_customer_id;
    
    RAISE NOTICE 'Created new customer % with name % for seller %', v_new_customer_id, v_profile_name, v_product_seller_id;
    NEW.customer_id := v_new_customer_id;
    RETURN NEW;
  END IF;

  -- No phone in profile - try to find customer by email
  IF v_profile_email IS NOT NULL AND v_profile_email != '' THEN
    SELECT id INTO v_new_customer_id
    FROM customers
    WHERE seller_id = v_product_seller_id
    AND email = v_profile_email
    AND LOWER(TRIM(full_name)) = LOWER(TRIM(v_profile_name))
    LIMIT 1;

    IF v_new_customer_id IS NOT NULL THEN
      NEW.customer_id := v_new_customer_id;
      RETURN NEW;
    END IF;

    -- Create customer with email
    INSERT INTO customers (seller_id, full_name, email)
    VALUES (
      v_product_seller_id,
      COALESCE(v_profile_name, 'Unknown Customer'),
      v_profile_email
    )
    RETURNING id INTO v_new_customer_id;

    NEW.customer_id := v_new_customer_id;
    RETURN NEW;
  END IF;

  -- No phone or email - raise error
  RAISE EXCEPTION 'Cannot create subscription: user profile has no phone or email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comment explaining the updated logic
COMMENT ON FUNCTION public.ensure_correct_subscription_customer() IS 
'Ensures customer_app subscriptions are linked to a customer matching the user profile name AND belonging to the correct seller. Creates new customer if no match found.';