
-- Repair existing subscriptions - use unique placeholder phone when profile phone causes conflict
DO $$
DECLARE
  r RECORD;
  v_correct_customer_id uuid;
  v_product_seller_id uuid;
  v_placeholder_phone text;
BEGIN
  -- Loop through all mismatched subscriptions
  FOR r IN 
    SELECT DISTINCT
      s.id as subscription_id,
      s.user_id,
      s.product_id,
      p.full_name as profile_name,
      p.phone as profile_phone,
      c.seller_id
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN profiles p ON s.user_id = p.user_id
    WHERE s.source = 'customer_app'
    AND LOWER(TRIM(c.full_name)) != LOWER(TRIM(p.full_name))
  LOOP
    -- Get product seller
    SELECT seller_id INTO v_product_seller_id
    FROM products WHERE id = r.product_id;
    
    -- Find existing customer with correct name for this seller
    SELECT id INTO v_correct_customer_id
    FROM customers
    WHERE seller_id = v_product_seller_id
    AND LOWER(TRIM(full_name)) = LOWER(TRIM(r.profile_name))
    LIMIT 1;
    
    -- If no customer exists, create one
    IF v_correct_customer_id IS NULL THEN
      -- Check if we can use the profile phone
      IF r.profile_phone IS NOT NULL THEN
        -- Check if phone already exists for this seller
        SELECT id INTO v_correct_customer_id
        FROM customers
        WHERE seller_id = v_product_seller_id
        AND phone = r.profile_phone
        LIMIT 1;
        
        IF v_correct_customer_id IS NOT NULL THEN
          -- Update the existing customer's name to match profile
          UPDATE customers SET full_name = r.profile_name WHERE id = v_correct_customer_id;
          RAISE NOTICE 'Updated existing customer % name to %', v_correct_customer_id, r.profile_name;
        ELSE
          -- Create new customer with phone
          INSERT INTO customers (seller_id, full_name, phone)
          VALUES (v_product_seller_id, r.profile_name, r.profile_phone)
          RETURNING id INTO v_correct_customer_id;
          RAISE NOTICE 'Created customer % with phone', v_correct_customer_id;
        END IF;
      ELSE
        -- No phone - use unique placeholder
        v_placeholder_phone := 'AUTO_' || substring(gen_random_uuid()::text, 1, 8);
        INSERT INTO customers (seller_id, full_name, phone)
        VALUES (v_product_seller_id, r.profile_name, v_placeholder_phone)
        RETURNING id INTO v_correct_customer_id;
        RAISE NOTICE 'Created customer % with placeholder phone', v_correct_customer_id;
      END IF;
    END IF;
    
    -- Update subscription to point to correct customer
    IF v_correct_customer_id IS NOT NULL THEN
      UPDATE subscriptions
      SET customer_id = v_correct_customer_id
      WHERE id = r.subscription_id;
      
      RAISE NOTICE 'Updated subscription % to customer %', r.subscription_id, v_correct_customer_id;
    END IF;
  END LOOP;
END $$;
