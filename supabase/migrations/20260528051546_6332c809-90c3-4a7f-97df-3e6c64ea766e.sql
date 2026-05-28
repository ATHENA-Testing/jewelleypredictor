CREATE TABLE public.user_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metal varchar(50) NOT NULL,
  quantity_grams numeric NOT NULL CHECK (quantity_grams > 0),
  purchase_price_per_gram numeric NOT NULL CHECK (purchase_price_per_gram >= 0),
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_holdings_user ON public.user_holdings(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_holdings TO authenticated;
GRANT ALL ON public.user_holdings TO service_role;

ALTER TABLE public.user_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own holdings" ON public.user_holdings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own holdings" ON public.user_holdings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own holdings" ON public.user_holdings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own holdings" ON public.user_holdings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all holdings" ON public.user_holdings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));