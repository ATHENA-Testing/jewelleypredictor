-- Create table for storing historical metal prices
CREATE TABLE IF NOT EXISTS public.metal_prices_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metal VARCHAR(50) NOT NULL,
  price_per_gram DECIMAL(10, 2) NOT NULL,
  price_per_troy_oz DECIMAL(10, 2) NOT NULL,
  change_percent DECIMAL(5, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_metal_prices_history_metal_date ON public.metal_prices_history(metal, recorded_at DESC);

-- Create table for AI predictions
CREATE TABLE IF NOT EXISTS public.metal_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metal VARCHAR(50) NOT NULL,
  prediction_date DATE NOT NULL,
  predicted_price DECIMAL(10, 2) NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL,
  reasoning TEXT NOT NULL,
  sources JSONB,
  confidence_high DECIMAL(10, 2) NOT NULL,
  confidence_low DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metal, prediction_date)
);

-- Create index for predictions
CREATE INDEX idx_metal_predictions_metal_date ON public.metal_predictions(metal, prediction_date DESC);

-- Create table for market analysis
CREATE TABLE IF NOT EXISTS public.market_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metal VARCHAR(50) NOT NULL,
  analysis_type VARCHAR(50) NOT NULL,
  analysis_text TEXT NOT NULL,
  sentiment VARCHAR(20),
  key_factors JSONB,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for market analysis
CREATE INDEX idx_market_analysis_metal_date ON public.market_analysis(metal, created_at DESC);

-- Enable RLS
ALTER TABLE public.metal_prices_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metal_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to metal_prices_history"
  ON public.metal_prices_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to metal_predictions"
  ON public.metal_predictions FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to market_analysis"
  ON public.market_analysis FOR SELECT
  USING (true);