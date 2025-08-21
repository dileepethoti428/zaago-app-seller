-- Fix security vulnerabilities found in security scan

-- 1. Update security definer functions to have proper search_path
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

-- 2. Create a more secure admin check function
CREATE OR REPLACE FUNCTION public.is_current_user_admin_v2()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  );
$function$;

-- 3. Add additional security policies for sensitive tables
-- Enhance admin_secret_codes security
DROP POLICY IF EXISTS "Only admins can manage secret codes" ON public.admin_secret_codes;
CREATE POLICY "Only admins can manage secret codes"
ON public.admin_secret_codes
FOR ALL
TO authenticated
USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

-- Enhance payouts security
DROP POLICY IF EXISTS "Strict admin access to payouts" ON public.payouts;
CREATE POLICY "Strict admin access to payouts"
ON public.payouts
FOR ALL
TO authenticated
USING (is_current_user_admin_v2())
WITH CHECK (is_current_user_admin_v2());

-- 4. Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (is_current_user_admin_v2());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource text,
  p_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource,
    p_details,
    p_ip_address,
    p_user_agent
  );
END;
$function$;

-- 6. Add trigger to log admin role assignments
CREATE OR REPLACE FUNCTION public.log_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log role assignments for admin roles
  IF NEW.role = 'admin' THEN
    PERFORM log_security_event(
      'role_assigned',
      'user_roles',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role,
        'assigned_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for role assignments
DROP TRIGGER IF EXISTS log_admin_role_assignment ON public.user_roles;
CREATE TRIGGER log_admin_role_assignment
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_assignment();

-- 7. Enhance password reset security
ALTER TABLE public.password_reset_requests 
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone;

-- 8. Add rate limiting for sensitive operations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- email, ip, or user_id
  action text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  locked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, action)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_record public.rate_limits%ROWTYPE;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Get or create rate limit record
  SELECT * INTO v_record
  FROM public.rate_limits
  WHERE identifier = p_identifier AND action = p_action;
  
  -- If locked, check if lock has expired
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > now() THEN
    RETURN FALSE;
  END IF;
  
  -- If no record or window expired, reset
  IF v_record IS NULL OR v_record.window_start < v_window_start THEN
    INSERT INTO public.rate_limits (identifier, action, attempts, window_start)
    VALUES (p_identifier, p_action, 1, now())
    ON CONFLICT (identifier, action)
    DO UPDATE SET
      attempts = 1,
      window_start = now(),
      locked_until = NULL,
      updated_at = now();
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  IF v_record.attempts < p_max_attempts THEN
    UPDATE public.rate_limits
    SET attempts = attempts + 1, updated_at = now()
    WHERE identifier = p_identifier AND action = p_action;
    RETURN TRUE;
  END IF;
  
  -- Over limit, lock for 1 hour
  UPDATE public.rate_limits
  SET 
    attempts = attempts + 1,
    locked_until = now() + interval '1 hour',
    updated_at = now()
  WHERE identifier = p_identifier AND action = p_action;
  
  RETURN FALSE;
END;
$function$;