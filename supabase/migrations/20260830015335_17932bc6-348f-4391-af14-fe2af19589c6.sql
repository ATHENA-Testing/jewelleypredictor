CREATE OR REPLACE FUNCTION private.extend_subscription_days(_user_id uuid, _days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR (_user_id <> auth.uid() AND NOT private.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _days < -365 OR _days > 365 THEN
    RAISE EXCEPTION 'invalid extension';
  END IF;
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

CREATE OR REPLACE FUNCTION private.admin_get_usage_activity()
RETURNS TABLE(
  user_id uuid,
  email text,
  last_sign_in_at timestamptz,
  active_days_30d bigint,
  page_views_30d bigint,
  last_activity_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    u.last_sign_in_at,
    COALESCE((SELECT COUNT(DISTINCT (va.visited_at AT TIME ZONE 'Asia/Kolkata')::date)
      FROM public.visitor_analytics va
      WHERE va.user_id = u.id AND va.visited_at >= now() - interval '30 days'), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM public.visitor_analytics va
      WHERE va.user_id = u.id AND va.visited_at >= now() - interval '30 days'), 0)::bigint,
    GREATEST(u.last_sign_in_at, (SELECT MAX(va.visited_at) FROM public.visitor_analytics va WHERE va.user_id = u.id))
  FROM auth.users u
  ORDER BY last_activity_at DESC NULLS LAST, u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_usage_activity()
RETURNS TABLE(
  user_id uuid,
  email text,
  last_sign_in_at timestamptz,
  active_days_30d bigint,
  page_views_30d bigint,
  last_activity_at timestamptz
)
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.admin_get_usage_activity();
$$;

REVOKE ALL ON FUNCTION public.admin_get_usage_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_usage_activity() TO authenticated, service_role;