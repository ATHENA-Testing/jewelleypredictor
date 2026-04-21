-- Admin activity RPC: returns per-user plan + status, admin-only
CREATE OR REPLACE FUNCTION public.admin_get_user_activity()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  signed_up_at timestamptz,
  role text,
  plan_name text,
  plan_price numeric,
  subscription_status text,
  starts_at timestamptz,
  expires_at timestamptz,
  amount_paid numeric,
  is_trial boolean,
  is_active boolean,
  days_remaining integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  WITH latest_sub AS (
    SELECT DISTINCT ON (us.user_id)
      us.user_id,
      us.plan_id,
      us.status,
      us.starts_at,
      us.expires_at,
      us.amount_paid
    FROM public.user_subscriptions us
    ORDER BY us.user_id, us.expires_at DESC NULLS LAST, us.created_at DESC
  )
  SELECT
    p.user_id,
    p.email,
    p.full_name,
    p.created_at AS signed_up_at,
    COALESCE((
      SELECT ur.role FROM public.user_roles ur
      WHERE ur.user_id = p.user_id
      ORDER BY (ur.role = 'admin') DESC LIMIT 1
    ), 'user') AS role,
    sp.name AS plan_name,
    sp.price_inr AS plan_price,
    ls.status AS subscription_status,
    ls.starts_at,
    ls.expires_at,
    COALESCE(ls.amount_paid, 0) AS amount_paid,
    (lower(COALESCE(sp.name, '')) = 'free trial') AS is_trial,
    (ls.status = 'active' AND ls.expires_at > now()) AS is_active,
    GREATEST(0, EXTRACT(DAY FROM (ls.expires_at - now()))::int) AS days_remaining
  FROM public.profiles p
  LEFT JOIN latest_sub ls ON ls.user_id = p.user_id
  LEFT JOIN public.subscription_plans sp ON sp.id = ls.plan_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Admin revenue summary RPC
CREATE OR REPLACE FUNCTION public.admin_get_revenue_summary()
RETURNS TABLE (
  total_users bigint,
  active_paid bigint,
  active_trials bigint,
  expired_users bigint,
  total_revenue numeric,
  revenue_30d numeric,
  plan_name text,
  plan_subscribers bigint,
  plan_revenue numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  WITH totals AS (
    SELECT
      (SELECT COUNT(*) FROM public.profiles) AS total_users,
      (SELECT COUNT(DISTINCT us.user_id) FROM public.user_subscriptions us
       JOIN public.subscription_plans sp ON sp.id = us.plan_id
       WHERE us.status = 'active' AND us.expires_at > now() AND sp.price_inr > 0) AS active_paid,
      (SELECT COUNT(DISTINCT us.user_id) FROM public.user_subscriptions us
       JOIN public.subscription_plans sp ON sp.id = us.plan_id
       WHERE us.status = 'active' AND us.expires_at > now() AND sp.price_inr = 0) AS active_trials,
      (SELECT COUNT(DISTINCT us.user_id) FROM public.user_subscriptions us
       WHERE us.expires_at <= now()) AS expired_users,
      (SELECT COALESCE(SUM(amount_paid), 0) FROM public.user_subscriptions) AS total_revenue,
      (SELECT COALESCE(SUM(amount_paid), 0) FROM public.user_subscriptions
       WHERE created_at >= now() - interval '30 days') AS revenue_30d
  ),
  per_plan AS (
    SELECT sp.name AS plan_name,
           COUNT(us.id)::bigint AS plan_subscribers,
           COALESCE(SUM(us.amount_paid), 0) AS plan_revenue
    FROM public.subscription_plans sp
    LEFT JOIN public.user_subscriptions us ON us.plan_id = sp.id
    GROUP BY sp.name
    ORDER BY plan_revenue DESC
  )
  SELECT t.total_users, t.active_paid, t.active_trials, t.expired_users,
         t.total_revenue, t.revenue_30d,
         pp.plan_name, pp.plan_subscribers, pp.plan_revenue
  FROM totals t
  CROSS JOIN per_plan pp;
END;
$$;