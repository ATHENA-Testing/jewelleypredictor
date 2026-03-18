-- Ensure every new non-admin user gets an active free-trial subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_plan_id uuid;
  v_trial_days integer;
BEGIN
  -- Ensure profile row exists
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

    -- Auto-assign free trial subscription
    SELECT sp.id, sp.duration_days
      INTO v_trial_plan_id, v_trial_days
    FROM public.subscription_plans sp
    WHERE lower(sp.name) = 'free trial'
      AND sp.is_active = true
    ORDER BY sp.sort_order ASC, sp.created_at ASC
    LIMIT 1;

    IF v_trial_plan_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM public.user_subscriptions us
         WHERE us.user_id = NEW.id
           AND us.plan_id = v_trial_plan_id
       ) THEN
      INSERT INTO public.user_subscriptions (
        user_id,
        plan_id,
        starts_at,
        expires_at,
        amount_paid,
        status
      ) VALUES (
        NEW.id,
        v_trial_plan_id,
        now(),
        now() + make_interval(days => GREATEST(COALESCE(v_trial_days, 3), 1)),
        0,
        'active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Keep trigger idempotent and present
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();