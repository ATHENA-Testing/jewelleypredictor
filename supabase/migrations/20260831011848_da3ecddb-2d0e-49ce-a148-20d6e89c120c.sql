CREATE OR REPLACE FUNCTION private.admin_get_manual_market_rates()
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

CREATE OR REPLACE FUNCTION private.admin_set_manual_market_rate(
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
  IF NOT FOUND THEN RAISE EXCEPTION 'rate not found'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target, metadata)
  SELECT auth.uid(), u.email, 'rate.update', _metal, jsonb_build_object('price_per_gram', _price_per_gram)
  FROM auth.users u WHERE u.id = auth.uid();
  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_get_manual_market_rates();
DROP FUNCTION IF EXISTS public.admin_set_manual_market_rate(character varying, numeric, text);

CREATE OR REPLACE FUNCTION public.admin_get_manual_market_rates()
RETURNS TABLE (
  id uuid,
  metal character varying,
  price_per_gram numeric,
  updated_at timestamp with time zone,
  updated_by uuid,
  notes text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$ SELECT * FROM private.admin_get_manual_market_rates(); $$;

CREATE OR REPLACE FUNCTION public.admin_set_manual_market_rate(
  _metal character varying,
  _price_per_gram numeric,
  _notes text
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$ SELECT private.admin_set_manual_market_rate($1, $2, $3); $$;

REVOKE ALL ON FUNCTION public.admin_get_manual_market_rates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_manual_market_rates() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_manual_market_rate(character varying, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_manual_market_rate(character varying, numeric, text) TO authenticated, service_role;