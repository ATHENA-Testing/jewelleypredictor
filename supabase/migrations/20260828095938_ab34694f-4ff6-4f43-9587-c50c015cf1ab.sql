
-- ============ ROLE HELPERS ============
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = _user_id
      AND lower(u.email) IN ('p.sridhar557@gmail.com','sridhar@admin.com')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- ============ AI MODEL REGISTRY ============
CREATE TABLE public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL UNIQUE,
  label text NOT NULL,
  provider text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_models TO authenticated;
GRANT ALL ON public.ai_models TO service_role;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manages ai models" ON public.ai_models FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.ai_feature_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature text NOT NULL UNIQUE,
  label text NOT NULL,
  active_model text NOT NULL,
  fallback_models text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feature_config TO authenticated;
GRANT ALL ON public.ai_feature_config TO service_role;
ALTER TABLE public.ai_feature_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manages ai feature config" ON public.ai_feature_config FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.ai_models (model_id,label,provider,enabled) VALUES
  ('google/gemini-3.1-pro-preview','Gemini 3.1 Pro (preview)','Google',true),
  ('google/gemini-3.7-flash','Gemini 3.7 Flash','Google',true),
  ('google/gemini-3.1-flash-lite','Gemini 3.1 Flash Lite','Google',true),
  ('google/gemini-2.5-pro','Gemini 2.5 Pro','Google',true),
  ('google/gemini-2.5-flash','Gemini 2.5 Flash','Google',true),
  ('openai/gpt-5.5','GPT-5.5','OpenAI',true),
  ('openai/gpt-5.4-mini','GPT-5.4 Mini','OpenAI',true),
  ('openai/gpt-5-mini','GPT-5 Mini','OpenAI',true),
  ('openai/gpt-5-nano','GPT-5 Nano','OpenAI',true);

INSERT INTO public.ai_feature_config (feature,label,active_model,fallback_models) VALUES
  ('assistant','AI Metal Market Expert (chat)','google/gemini-2.5-pro',ARRAY['google/gemini-2.5-flash','google/gemini-2.5-flash-lite','openai/gpt-5-mini','openai/gpt-5-nano']),
  ('predictions','Price Predictions','google/gemini-2.5-pro',ARRAY['google/gemini-2.5-flash','openai/gpt-5-mini']),
  ('market_analysis','Market Analysis','google/gemini-2.5-pro',ARRAY['google/gemini-2.5-flash','openai/gpt-5-mini']);

-- ============ INTEGRATIONS / PLUGINS ============
CREATE TABLE public.integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'api',
  enabled boolean NOT NULL DEFAULT false,
  secret_name text,
  secret_set boolean NOT NULL DEFAULT false,
  secret_last_rotated timestamptz,
  status text NOT NULL DEFAULT 'unknown',
  last_tested_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_configs TO authenticated;
GRANT ALL ON public.integration_configs TO service_role;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manages integrations" ON public.integration_configs FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.integration_configs (provider_key,label,category,enabled,secret_name,secret_set,status) VALUES
  ('lovable_ai','Lovable AI Gateway','ai',true,'LOVABLE_API_KEY',true,'active'),
  ('firecrawl','Firecrawl Scraper','plugin',true,'FIRECRAWL_API_KEY',true,'active'),
  ('razorpay','Razorpay Payments','payments',true,'RAZORPAY_KEY_SECRET',true,'active'),
  ('metals_api','Metals Price API','api',true,'METALS_API_KEY',true,'active');

-- ============ STORAGE CONFIG ============
CREATE TABLE public.storage_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_configured',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_config TO authenticated;
GRANT ALL ON public.storage_config TO service_role;
ALTER TABLE public.storage_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manages storage" ON public.storage_config FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.storage_config (provider,label,is_active,status) VALUES
  ('cloud','App Cloud Storage (default)',true,'active'),
  ('google_drive','Google Drive',false,'not_configured');

-- ============ AUDIT LOG ============
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin reads audit" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super admin writes audit" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) AND actor_id = auth.uid());

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  account_alerts boolean NOT NULL DEFAULT true,
  transaction_alerts boolean NOT NULL DEFAULT true,
  price_alerts boolean NOT NULL DEFAULT true,
  reminders boolean NOT NULL DEFAULT true,
  security_alerts boolean NOT NULL DEFAULT true,
  promotions boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notification prefs" ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own device tokens" ON public.device_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'update',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.user_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "update own notifications" ON public.user_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PLATFORM ANALYTICS (SUPER ADMIN ONLY) ============
CREATE OR REPLACE FUNCTION public.admin_platform_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'new_users_7d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'new_users_30d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'active_users_7d', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '7 days'),
    'active_users_24h', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '24 hours'),
    'confirmed_users', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'active_subscriptions', (SELECT count(*) FROM public.user_subscriptions WHERE expires_at > now()),
    'total_alerts', (SELECT count(*) FROM public.price_alerts),
    'total_holdings', (SELECT count(*) FROM public.user_holdings),
    'total_goals', (SELECT count(*) FROM public.user_goals),
    'signup_series', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', c) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at) d, count(*) c
        FROM auth.users WHERE created_at > now() - interval '30 days'
        GROUP BY 1
      ) s
    )
  ) INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_platform_analytics() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(_user_id uuid, _suspended boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _suspended THEN
    UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE id = _user_id;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = _user_id;
  END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target, metadata)
  VALUES (auth.uid(), CASE WHEN _suspended THEN 'user.suspend' ELSE 'user.reinstate' END, _user_id::text, '{}'::jsonb);
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, boolean) TO authenticated;
