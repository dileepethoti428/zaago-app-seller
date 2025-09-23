-- Fix the notification preferences trigger function to match actual table structure
CREATE OR REPLACE FUNCTION public.ensure_notification_preferences_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create notification preferences with all notifications enabled by default
  INSERT INTO public.notification_preferences (
    user_id,
    admin_notifications,
    order_notifications,
    marketing_notifications,
    push_notifications,
    email_notifications,
    sms_notifications
  ) VALUES (
    NEW.id,
    true,
    true,
    false,  -- marketing disabled by default
    true,
    true,
    false   -- SMS disabled by default
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;