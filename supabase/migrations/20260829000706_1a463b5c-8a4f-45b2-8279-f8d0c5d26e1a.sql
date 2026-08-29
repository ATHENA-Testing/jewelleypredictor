CREATE SCHEMA IF NOT EXISTS private;

-- Keep internal implementations outside the API-facing schema.
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
    OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _user_id AND lower(u.email) IN ('p.sridhar557@gmail.com','sridhar@admin.com'));
$$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.is_super_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION private.extend_subscription_days(_user_id uuid, _days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET expires_at = GREATEST(expires_at, now()) + make_interval(days => _days), updated_at = now()
  WHERE user_id = _user_id
    AND id = (
      SELECT id FROM public.user_subscriptions
      WHERE user_id = _user_id
      ORDER BY expires_at DESC NULLS LAST LIMIT 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION private.apply_referral_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _referrer uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _code IS NULL OR length(_code) < 4 THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  SELECT user_id INTO _referrer FROM public.profiles WHERE referral_code = upper(_code);
  IF _referrer IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _referrer = _uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'self_referral'); END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_user_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;
  INSERT INTO public.referrals(referrer_user_id, referee_user_id, referral_code, status, reward_granted_at)
  VALUES (_referrer, _uid, upper(_code), 'rewarded', now());
  INSERT INTO public.user_rewards(user_id, referral_bonus_days) VALUES (_referrer, 3)
    ON CONFLICT (user_id) DO UPDATE SET referral_bonus_days = public.user_rewards.referral_bonus_days + 3, updated_at = now();
  INSERT INTO public.user_rewards(user_id, referral_bonus_days) VALUES (_uid, 3)
    ON CONFLICT (user_id) DO UPDATE SET referral_bonus_days = public.user_rewards.referral_bonus_days + 3, updated_at = now();
  PERFORM private.extend_subscription_days(_referrer, 3);
  PERFORM private.extend_subscription_days(_uid, 3);
  RETURN jsonb_build_object('ok', true, 'days_added', 3);
END;
$$;

CREATE OR REPLACE FUNCTION private.claim_share_reward()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.user_rewards%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.user_rewards(user_id) VALUES (_uid) ON CONFLICT DO NOTHING;
  SELECT * INTO _row FROM public.user_rewards WHERE user_id = _uid FOR UPDATE;
  IF _row.last_share_at IS NOT NULL AND _row.last_share_at > now() - interval '1 hour' THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'cooldown', 'bonus_days', _row.share_bonus_days);
  END IF;
  IF _row.share_bonus_days >= 7 THEN
    UPDATE public.user_rewards SET share_count = share_count + 1, last_share_at = now(), updated_at = now() WHERE user_id = _uid;
    RETURN jsonb_build_object('granted', false, 'reason', 'cap_reached', 'bonus_days', 7);
  END IF;
  UPDATE public.user_rewards
  SET share_count = share_count + 1, share_bonus_days = share_bonus_days + 1, last_share_at = now(), updated_at = now()
  WHERE user_id = _uid;
  PERFORM private.extend_subscription_days(_uid, 1);
  RETURN jsonb_build_object('granted', true, 'days_added', 1, 'bonus_days', _row.share_bonus_days + 1);
END;
$$;

CREATE OR REPLACE FUNCTION private.record_login_streak()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.user_rewards%ROWTYPE;
  _today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _new_streak integer;
  _bonus boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.user_rewards(user_id, last_login_date, current_streak, longest_streak)
  VALUES (_uid, _today, 1, 1) ON CONFLICT DO NOTHING;
  SELECT * INTO _row FROM public.user_rewards WHERE user_id = _uid FOR UPDATE;
  IF _row.last_login_date = _today THEN RETURN jsonb_build_object('streak', _row.current_streak, 'changed', false); END IF;
  IF _row.last_login_date = _today - 1 THEN _new_streak := _row.current_streak + 1; ELSE _new_streak := 1; END IF;
  IF _new_streak > 0 AND _new_streak % 7 = 0 THEN _bonus := true; PERFORM private.extend_subscription_days(_uid, 1); END IF;
  UPDATE public.user_rewards
  SET current_streak = _new_streak, longest_streak = GREATEST(longest_streak, _new_streak), last_login_date = _today,
      streak_bonus_days = streak_bonus_days + CASE WHEN _bonus THEN 1 ELSE 0 END, updated_at = now()
  WHERE user_id = _uid;
  RETURN jsonb_build_object('streak', _new_streak, 'changed', true, 'bonus_granted', _bonus);
END;
$$;

CREATE OR REPLACE FUNCTION private.admin_get_revenue_summary()
RETURNS TABLE(total_users bigint, active_paid bigint, active_trials bigint, expired_users bigint, total_revenue numeric, revenue_30d numeric, plan_name text, plan_subscribers bigint, plan_revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Access denied: admin only'; END IF;
  RETURN QUERY
  WITH totals AS (
    SELECT (SELECT COUNT(*) FROM public.profiles),
      (SELECT COUNT(DISTINCT us.user_id) FROM public.user_subscriptions us JOIN public.subscription_plans sp ON sp.id = us.plan_id WHERE us.status = 'active' AND us.expires_at > now() AND sp.price_inr > 0),
      (SELECT COUNT(DISTINCT us.user_id) FROM public.user_subscriptions us JOIN public.subscription_plans sp ON sp.id = us.plan_id WHERE us.status = 'active' AND us.expires_at > now() AND sp.price_inr = 0),
      (SELECT COUNT(DISTINCT us.user_id) FROM public.user_subscriptions us WHERE us.expires_at <= now()),
      (SELECT COALESCE(SUM(amount_paid), 0) FROM public.user_subscriptions),
      (SELECT COALESCE(SUM(amount_paid), 0) FROM public.user_subscriptions WHERE created_at >= now() - interval '30 days')
  ), per_plan AS (
    SELECT sp.name, COUNT(us.id)::bigint, COALESCE(SUM(us.amount_paid), 0)
    FROM public.subscription_plans sp LEFT JOIN public.user_subscriptions us ON us.plan_id = sp.id GROUP BY sp.name ORDER BY 3 DESC
  )
  SELECT t.*, pp.name, pp.count, pp.coalesce FROM totals t CROSS JOIN per_plan pp;
END;
$$;

CREATE OR REPLACE FUNCTION private.admin_get_user_activity()
RETURNS TABLE(user_id uuid, email text, full_name text, signed_up_at timestamptz, role text, plan_name text, plan_price numeric, subscription_status text, starts_at timestamptz, expires_at timestamptz, amount_paid numeric, is_trial boolean, is_active boolean, days_remaining integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Access denied: admin only'; END IF;
  RETURN QUERY
  WITH latest_sub AS (
    SELECT DISTINCT ON (us.user_id) us.user_id, us.plan_id, us.status, us.starts_at, us.expires_at, us.amount_paid
    FROM public.user_subscriptions us ORDER BY us.user_id, us.expires_at DESC NULLS LAST, us.created_at DESC
  )
  SELECT p.user_id, p.email, p.full_name, p.created_at, COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.user_id ORDER BY (ur.role = 'admin') DESC LIMIT 1), 'user'),
    sp.name, sp.price_inr, ls.status, ls.starts_at, ls.expires_at, COALESCE(ls.amount_paid, 0), lower(COALESCE(sp.name, '')) = 'free trial',
    (ls.status = 'active' AND ls.expires_at > now()), GREATEST(0, EXTRACT(DAY FROM (ls.expires_at - now()))::int)
  FROM public.profiles p LEFT JOIN latest_sub ls ON ls.user_id = p.user_id LEFT JOIN public.subscription_plans sp ON sp.id = ls.plan_id ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION private.admin_platform_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT private.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users), 'new_users_7d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'new_users_30d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'), 'active_users_7d', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '7 days'),
    'active_users_24h', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '24 hours'), 'confirmed_users', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
    'active_subscriptions', (SELECT count(*) FROM public.user_subscriptions WHERE expires_at > now()), 'total_alerts', (SELECT count(*) FROM public.price_alerts),
    'total_holdings', (SELECT count(*) FROM public.user_holdings), 'total_goals', (SELECT count(*) FROM public.user_goals),
    'signup_series', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', c) ORDER BY d), '[]'::jsonb) FROM (SELECT date_trunc('day', created_at) d, count(*) c FROM auth.users WHERE created_at > now() - interval '30 days' GROUP BY 1) s)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION private.admin_set_user_status(_user_id uuid, _suspended boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _suspended THEN UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE id = _user_id;
  ELSE UPDATE auth.users SET banned_until = NULL WHERE id = _user_id; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target, metadata) VALUES (auth.uid(), CASE WHEN _suspended THEN 'user.suspend' ELSE 'user.reinstate' END, _user_id::text, '{}'::jsonb);
  RETURN true;
END;
$$;

-- Public API entry points are invoker functions, so they retain auth context but do not elevate callers.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT private.has_role($1, $2); $$;
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT private.is_super_admin($1); $$;
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT private.is_admin($1); $$;
CREATE OR REPLACE FUNCTION public.extend_subscription_days(_user_id uuid, _days integer) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.extend_subscription_days($1, $2); $$;
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.apply_referral_code($1); $$;
CREATE OR REPLACE FUNCTION public.claim_share_reward() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.claim_share_reward(); $$;
CREATE OR REPLACE FUNCTION public.record_login_streak() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.record_login_streak(); $$;
CREATE OR REPLACE FUNCTION public.admin_get_revenue_summary() RETURNS TABLE(total_users bigint, active_paid bigint, active_trials bigint, expired_users bigint, total_revenue numeric, revenue_30d numeric, plan_name text, plan_subscribers bigint, plan_revenue numeric) LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM private.admin_get_revenue_summary(); $$;
CREATE OR REPLACE FUNCTION public.admin_get_user_activity() RETURNS TABLE(user_id uuid, email text, full_name text, signed_up_at timestamptz, role text, plan_name text, plan_price numeric, subscription_status text, starts_at timestamptz, expires_at timestamptz, amount_paid numeric, is_trial boolean, is_active boolean, days_remaining integer) LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM private.admin_get_user_activity(); $$;
CREATE OR REPLACE FUNCTION public.admin_platform_analytics() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.admin_platform_analytics(); $$;
CREATE OR REPLACE FUNCTION public.admin_set_user_status(_user_id uuid, _suspended boolean) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT private.admin_set_user_status($1, $2); $$;

-- Trigger-only function: no API caller should execute it.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.gen_ref_code() SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.extend_subscription_days(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_referral_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_share_reward() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_streak() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_revenue_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_user_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_platform_analytics() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid, boolean) FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_share_reward() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_login_streak() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_user_activity() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_platform_analytics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, boolean) TO authenticated, service_role;