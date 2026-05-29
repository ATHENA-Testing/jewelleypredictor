-- 1. Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- helper: generate short referral code
CREATE OR REPLACE FUNCTION public.gen_ref_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE c TEXT; BEGIN
  LOOP
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = c);
  END LOOP;
  RETURN c;
END $$;

-- Backfill codes for existing profiles
UPDATE public.profiles SET referral_code = public.gen_ref_code() WHERE referral_code IS NULL;

-- 2. user_rewards (login streak + share bonuses)
CREATE TABLE IF NOT EXISTS public.user_rewards (
  user_id UUID PRIMARY KEY,
  share_count INTEGER NOT NULL DEFAULT 0,
  share_bonus_days INTEGER NOT NULL DEFAULT 0,
  referral_bonus_days INTEGER NOT NULL DEFAULT 0,
  streak_bonus_days INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  last_share_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_rewards TO authenticated;
GRANT ALL ON public.user_rewards TO service_role;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own rewards" ON public.user_rewards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rewards" ON public.user_rewards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rewards" ON public.user_rewards FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all rewards" ON public.user_rewards FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 3. referrals (track signups via referral code)
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referee_user_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view referrals they made" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referee_user_id);
CREATE POLICY "Admins view all referrals" ON public.referrals FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 4. user_goals (goal-based savings planner)
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_name TEXT NOT NULL,
  metal VARCHAR NOT NULL,
  target_grams NUMERIC NOT NULL,
  target_date DATE NOT NULL,
  monthly_budget NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own goals" ON public.user_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own goals" ON public.user_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.user_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON public.user_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. whatsapp_optins (daily digest opt-in)
CREATE TABLE IF NOT EXISTS public.whatsapp_optins (
  user_id UUID PRIMARY KEY,
  phone TEXT NOT NULL,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  preferred_time TIME NOT NULL DEFAULT '09:00:00',
  metals JSONB NOT NULL DEFAULT '["gold_22k","gold_24k","silver"]'::jsonb,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_optins TO authenticated;
GRANT ALL ON public.whatsapp_optins TO service_role;
ALTER TABLE public.whatsapp_optins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own optin" ON public.whatsapp_optins FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all optins" ON public.whatsapp_optins FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6. Helper: extend active subscription expiry by N days
CREATE OR REPLACE FUNCTION public.extend_subscription_days(_user_id UUID, _days INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET expires_at = GREATEST(expires_at, now()) + make_interval(days => _days),
      updated_at = now()
  WHERE user_id = _user_id
    AND id = (
      SELECT id FROM public.user_subscriptions
      WHERE user_id = _user_id
      ORDER BY expires_at DESC NULLS LAST LIMIT 1
    );
END $$;

-- 7. Share reward (+1 day, capped at 7 lifetime, min 1h between)
CREATE OR REPLACE FUNCTION public.claim_share_reward()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
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
    SET share_count = share_count + 1,
        share_bonus_days = share_bonus_days + 1,
        last_share_at = now(),
        updated_at = now()
    WHERE user_id = _uid;
  PERFORM public.extend_subscription_days(_uid, 1);
  RETURN jsonb_build_object('granted', true, 'days_added', 1, 'bonus_days', _row.share_bonus_days + 1);
END $$;
GRANT EXECUTE ON FUNCTION public.claim_share_reward() TO authenticated;

-- 8. Apply referral on signup (called from frontend after auth completes)
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _referrer UUID;
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

  -- both get +3 days
  INSERT INTO public.user_rewards(user_id, referral_bonus_days) VALUES (_referrer, 3)
    ON CONFLICT (user_id) DO UPDATE SET referral_bonus_days = public.user_rewards.referral_bonus_days + 3, updated_at = now();
  INSERT INTO public.user_rewards(user_id, referral_bonus_days) VALUES (_uid, 3)
    ON CONFLICT (user_id) DO UPDATE SET referral_bonus_days = public.user_rewards.referral_bonus_days + 3, updated_at = now();

  PERFORM public.extend_subscription_days(_referrer, 3);
  PERFORM public.extend_subscription_days(_uid, 3);
  RETURN jsonb_build_object('ok', true, 'days_added', 3);
END $$;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT) TO authenticated;

-- 9. Login streak tracker (called on dashboard mount; +1 day at 7-day streak)
CREATE OR REPLACE FUNCTION public.record_login_streak()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.user_rewards%ROWTYPE;
  _today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _new_streak INT;
  _bonus BOOLEAN := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.user_rewards(user_id, last_login_date, current_streak, longest_streak)
    VALUES (_uid, _today, 1, 1) ON CONFLICT DO NOTHING;
  SELECT * INTO _row FROM public.user_rewards WHERE user_id = _uid FOR UPDATE;

  IF _row.last_login_date = _today THEN
    RETURN jsonb_build_object('streak', _row.current_streak, 'changed', false);
  ELSIF _row.last_login_date = _today - 1 THEN
    _new_streak := _row.current_streak + 1;
  ELSE
    _new_streak := 1;
  END IF;

  IF _new_streak > 0 AND _new_streak % 7 = 0 THEN
    _bonus := true;
    PERFORM public.extend_subscription_days(_uid, 1);
  END IF;

  UPDATE public.user_rewards
    SET current_streak = _new_streak,
        longest_streak = GREATEST(longest_streak, _new_streak),
        last_login_date = _today,
        streak_bonus_days = streak_bonus_days + CASE WHEN _bonus THEN 1 ELSE 0 END,
        updated_at = now()
    WHERE user_id = _uid;
  RETURN jsonb_build_object('streak', _new_streak, 'changed', true, 'bonus_granted', _bonus);
END $$;
GRANT EXECUTE ON FUNCTION public.record_login_streak() TO authenticated;

-- 10. Update handle_new_user to also assign referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_plan_id uuid;
  v_trial_days integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, email, full_name, referral_code)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), public.gen_ref_code());
  END IF;

  IF lower(COALESCE(NEW.email, '')) = 'p.sridhar557@gmail.com' THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.id AND ur.role = 'admin') THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = NEW.id AND ur.role = 'user') THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
    END IF;

    SELECT sp.id, sp.duration_days INTO v_trial_plan_id, v_trial_days
    FROM public.subscription_plans sp
    WHERE lower(sp.name) = 'free trial' AND sp.is_active = true
    ORDER BY sp.sort_order ASC, sp.created_at ASC LIMIT 1;

    IF v_trial_plan_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = NEW.id AND us.plan_id = v_trial_plan_id
    ) THEN
      INSERT INTO public.user_subscriptions (user_id, plan_id, starts_at, expires_at, amount_paid, status)
      VALUES (NEW.id, v_trial_plan_id, now(),
              now() + make_interval(days => GREATEST(COALESCE(v_trial_days, 3), 1)), 0, 'active');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;