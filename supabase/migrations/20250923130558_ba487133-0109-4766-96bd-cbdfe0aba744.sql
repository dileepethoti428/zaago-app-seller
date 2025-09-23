-- Create trigger to handle seller profile creation after email confirmation
CREATE OR REPLACE FUNCTION public.handle_seller_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create seller profile if user has business_name in metadata
  IF NEW.raw_user_meta_data ? 'business_name' THEN
    -- Create seller profile
    INSERT INTO public.sellers (
      user_id,
      email,
      name,
      phone,
      business_name,
      approval_status
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'business_name'),
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'business_name',
      'pending'
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Create admin notification
    INSERT INTO public.admin_notifications (
      type,
      title,
      message,
      user_id,
      metadata
    ) VALUES (
      'new_seller_signup',
      'New Seller Registration',
      'New seller "' || (NEW.raw_user_meta_data->>'business_name') || '" has registered with email ' || NEW.email,
      NEW.id,
      jsonb_build_object(
        'seller_email', NEW.email,
        'business_name', NEW.raw_user_meta_data->>'business_name',
        'phone', NEW.raw_user_meta_data->>'phone',
        'signup_date', NEW.created_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after user email confirmation
CREATE OR REPLACE TRIGGER on_seller_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_seller_signup();