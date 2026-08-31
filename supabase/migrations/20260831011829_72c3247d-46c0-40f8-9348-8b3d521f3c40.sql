-- Public rate data contains only fields needed by the dashboard; internal notes stay protected.
CREATE OR REPLACE VIEW public.manual_market_rates_public
WITH (security_invoker = true)
AS
  SELECT id, metal, price_per_gram, updated_at
  FROM public.manual_market_rates;

REVOKE ALL ON TABLE public.manual_market_rates FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.manual_market_rates TO service_role;
GRANT SELECT ON public.manual_market_rates_public TO anon, authenticated;

DROP POLICY IF EXISTS "Allow public read access to prediction_learnings" ON public.prediction_learnings;
CREATE POLICY "Signed-in users can read prediction learnings"
ON public.prediction_learnings
FOR SELECT TO authenticated
USING (true);

REVOKE ALL ON TABLE public.prediction_learnings FROM PUBLIC, anon;
GRANT SELECT ON public.prediction_learnings TO authenticated;
GRANT ALL ON public.prediction_learnings TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_manual_market_rates()
RETURNS TABLE (
  id uuid,
  metal character varying,
  price_per_gram numeric,
  updated_at timestamp with time zone,
  updated_by uuid,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.metal, r.price_per_gram, r.updated_at, r.updated_by, r.notes
  FROM public.manual_market_rates r
  ORDER BY r.metal;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_manual_market_rate(
  _metal character varying,
  _price_per_gram numeric,
  _notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _metal IS NULL OR length(trim(_metal)) = 0 OR _price_per_gram IS NULL OR _price_per_gram <= 0 THEN
    RAISE EXCEPTION 'invalid rate';
  END IF;

  UPDATE public.manual_market_rates
  SET price_per_gram = _price_per_gram,
      notes = NULLIF(trim(COALESCE(_notes, '')), ''),
      updated_at = now(),
      updated_by = auth.uid()
  WHERE metal = _metal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'rate not found';
  END IF;

  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target, metadata)
  SELECT auth.uid(), u.email, 'rate.update', _metal,
         jsonb_build_object('price_per_gram', _price_per_gram)
  FROM auth.users u
  WHERE u.id = auth.uid();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_manual_market_rates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_manual_market_rates() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_manual_market_rate(character varying, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_manual_market_rate(character varying, numeric, text) TO authenticated, service_role;