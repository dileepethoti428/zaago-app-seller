
-- Recovery codes table
CREATE TABLE public.user_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

CREATE INDEX idx_user_recovery_codes_user ON public.user_recovery_codes(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_recovery_codes TO authenticated;
GRANT ALL ON public.user_recovery_codes TO service_role;

ALTER TABLE public.user_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recovery codes"
  ON public.user_recovery_codes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MFA verification attempts (rate limiting)
CREATE TABLE public.mfa_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context text NOT NULL CHECK (context IN ('login','disable','recovery','enroll')),
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfa_attempts_user_time ON public.mfa_verification_attempts(user_id, attempted_at DESC);

GRANT SELECT, INSERT ON public.mfa_verification_attempts TO authenticated;
GRANT ALL ON public.mfa_verification_attempts TO service_role;

ALTER TABLE public.mfa_verification_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own MFA attempts"
  ON public.mfa_verification_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own MFA attempts"
  ON public.mfa_verification_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- get_mfa_status: reads verified TOTP factors for current user
CREATE OR REPLACE FUNCTION public.get_mfa_status()
RETURNS TABLE(enabled boolean, factor_id uuid, factor_created_at timestamptz, recovery_codes_remaining int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    (f.id IS NOT NULL) AS enabled,
    f.id AS factor_id,
    f.created_at AS factor_created_at,
    COALESCE((SELECT count(*)::int FROM public.user_recovery_codes r
              WHERE r.user_id = v_user AND r.used_at IS NULL), 0) AS recovery_codes_remaining
  FROM auth.mfa_factors f
  WHERE f.user_id = v_user
    AND f.status = 'verified'
    AND f.factor_type = 'totp'
  ORDER BY f.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::timestamptz,
      COALESCE((SELECT count(*)::int FROM public.user_recovery_codes r
                WHERE r.user_id = v_user AND r.used_at IS NULL), 0);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mfa_status() TO authenticated;

-- consume_recovery_code
CREATE OR REPLACE FUNCTION public.consume_recovery_code(_code_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id INTO v_id
  FROM public.user_recovery_codes
  WHERE user_id = v_user AND code_hash = _code_hash AND used_at IS NULL
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_recovery_codes SET used_at = now() WHERE id = v_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_recovery_code(text) TO authenticated;

-- check_mfa_lockout: returns rows_left, locked, seconds_until_retry
CREATE OR REPLACE FUNCTION public.check_mfa_lockout(_context text)
RETURNS TABLE(locked boolean, seconds_remaining int, fails int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_fails int;
  v_oldest timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT count(*), min(attempted_at)
    INTO v_fails, v_oldest
  FROM public.mfa_verification_attempts
  WHERE user_id = v_user
    AND context = _context
    AND success = false
    AND attempted_at > (now() - interval '5 minutes');

  IF v_fails >= 5 THEN
    RETURN QUERY SELECT true,
      GREATEST(0, EXTRACT(EPOCH FROM ((v_oldest + interval '5 minutes') - now()))::int),
      v_fails;
  ELSE
    RETURN QUERY SELECT false, 0, v_fails;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_mfa_lockout(text) TO authenticated;

-- record_mfa_attempt
CREATE OR REPLACE FUNCTION public.record_mfa_attempt(_context text, _success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.mfa_verification_attempts(user_id, context, success)
  VALUES (v_user, _context, _success);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_mfa_attempt(text, boolean) TO authenticated;
