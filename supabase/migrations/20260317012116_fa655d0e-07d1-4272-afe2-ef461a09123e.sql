-- Fix signup/google auth failures by making trigger function schema-safe and idempotent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure profile row exists for every new auth user
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = NEW.id
  ) THEN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
  END IF;

  -- Assign admin/user role on signup
  IF lower(COALESCE(NEW.email, '')) = 'p.sridhar557@gmail.com' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.id AND ur.role = 'admin'
    ) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.id AND ur.role = 'user'
    ) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure signup trigger exists on auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();