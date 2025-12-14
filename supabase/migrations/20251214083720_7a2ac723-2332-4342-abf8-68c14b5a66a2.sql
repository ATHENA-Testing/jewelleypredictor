-- Create table for manual market rate overrides
CREATE TABLE public.manual_market_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metal VARCHAR NOT NULL UNIQUE,
  price_per_gram NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.manual_market_rates ENABLE ROW LEVEL SECURITY;

-- Public read access (for edge function)
CREATE POLICY "Allow public read access to manual_market_rates"
ON public.manual_market_rates
FOR SELECT
USING (true);

-- Admins can insert rates
CREATE POLICY "Admins can insert manual_market_rates"
ON public.manual_market_rates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can update rates
CREATE POLICY "Admins can update manual_market_rates"
ON public.manual_market_rates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete rates
CREATE POLICY "Admins can delete manual_market_rates"
ON public.manual_market_rates
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Insert default rates
INSERT INTO public.manual_market_rates (metal, price_per_gram, notes) VALUES
  ('Gold 24K', 8350, 'Default Hyderabad rate'),
  ('Gold 22K', 7655, 'Default Hyderabad rate'),
  ('Silver', 105, 'Default rate'),
  ('Platinum', 3200, 'Default rate'),
  ('Palladium', 3500, 'Default rate'),
  ('Diamond', 65000, 'Per carat rate');