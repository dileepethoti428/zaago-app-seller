-- Enhanced security fixes - Part 2: Add audit logging and rate limiting

-- Add audit logging for sensitive operations
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

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

-- Create policies for audit log
CREATE POLICY "Admins can view audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (is_current_user_admin_v2());

CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to log security events
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

-- Add rate limiting for sensitive operations
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

-- Create policy for rate limits
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function to check rate limits
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

-- Enhance password reset security
ALTER TABLE public.password_reset_requests 
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone;