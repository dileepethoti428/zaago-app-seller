-- Enhanced security fixes - Part 1: Update existing functions with proper search_path

-- Update security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.validate_secret_code(input_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_secret_codes 
    WHERE code = input_code AND is_active = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_bank_details(p_bank_name text, p_ifsc_code text, p_account_number text, p_account_holder_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Check all required fields are present
  IF p_bank_name IS NULL OR TRIM(p_bank_name) = '' OR
     p_ifsc_code IS NULL OR TRIM(p_ifsc_code) = '' OR
     p_account_number IS NULL OR TRIM(p_account_number) = '' OR
     p_account_holder_name IS NULL OR TRIM(p_account_holder_name) = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate IFSC code format (11 characters, first 4 letters, 5th is 0, last 6 alphanumeric)
  IF NOT p_ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Account number should be numeric and between 8-18 digits
  IF NOT p_account_number ~ '^[0-9]{8,18}$' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_reset_token(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.secret_code_reset_requests 
    WHERE request_token = token 
    AND status = 'pending' 
    AND expires_at > now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_register_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  -- Always allow admin registration for this system
  SELECT true;
$function$;

-- Update other security definer functions with proper search_path
CREATE OR REPLACE FUNCTION public.log_secret_code_usage(input_code text, user_email text, user_full_name text, user_ip text DEFAULT NULL::text, user_agent_string text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  code_record public.admin_secret_codes%ROWTYPE;
  usage_id UUID;
BEGIN
  -- Get the code record
  SELECT * INTO code_record
  FROM public.admin_secret_codes 
  WHERE code = input_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive secret code';
  END IF;
  
  -- Log the usage
  INSERT INTO public.secret_code_usage (
    code_id,
    email,
    full_name,
    ip_address,
    user_agent
  ) VALUES (
    code_record.id,
    user_email,
    user_full_name,
    user_ip,
    user_agent_string
  ) RETURNING id INTO usage_id;
  
  -- Create admin notification
  INSERT INTO public.admin_notifications (
    type,
    title,
    message,
    metadata
  ) VALUES (
    'secret_code_usage',
    'New Secret Code Usage',
    'User ' || user_full_name || ' (' || user_email || ') has used a secret code and is requesting access',
    jsonb_build_object(
      'user_email', user_email,
      'user_name', user_full_name,
      'code_used', input_code,
      'usage_id', usage_id,
      'timestamp', now()
    )
  );
  
  RETURN usage_id;
END;
$function$;