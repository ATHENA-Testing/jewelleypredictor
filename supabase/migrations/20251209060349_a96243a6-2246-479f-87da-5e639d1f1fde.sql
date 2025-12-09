-- Create table for storing prediction learnings (reinforcement learning feedback)
CREATE TABLE public.prediction_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metal VARCHAR NOT NULL,
  prediction_date DATE NOT NULL,
  predicted_price NUMERIC NOT NULL,
  actual_price NUMERIC,
  accuracy_percentage NUMERIC,
  learning_notes TEXT,
  match_reasons TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metal, prediction_date)
);

-- Enable RLS
ALTER TABLE public.prediction_learnings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to prediction_learnings"
ON public.prediction_learnings
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_prediction_learnings_metal_date ON public.prediction_learnings(metal, prediction_date DESC);