import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PredictionData {
  date: string;
  actual: number | null;
  predicted: number;
  confidence_high: number;
  confidence_low: number;
}

export interface PredictionAnalysis {
  confidence_score: number;
  reasoning: string;
  key_factors: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sources: string[];
}

export const usePredictions = (metal: string) => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [analysis, setAnalysis] = useState<PredictionAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, check if we have recent predictions in the database
      const { data: existingPredictions } = await supabase
        .from('metal_predictions')
        .select('*')
        .eq('metal', metal)
        .gte('prediction_date', new Date().toISOString().split('T')[0])
        .order('prediction_date', { ascending: true })
        .limit(10);

      // If we have predictions from today, use them
      if (existingPredictions && existingPredictions.length > 0) {
        const formattedData = existingPredictions.map(p => ({
          date: new Date(p.prediction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          actual: null,
          predicted: parseFloat(p.predicted_price.toString()),
          confidence_high: parseFloat(p.confidence_high.toString()),
          confidence_low: parseFloat(p.confidence_low.toString()),
        }));

        setPredictions(formattedData);
        setAnalysis({
          confidence_score: parseFloat(existingPredictions[0].confidence_score.toString()),
          reasoning: existingPredictions[0].reasoning,
          key_factors: [],
          sentiment: 'neutral',
          sources: existingPredictions[0].sources as string[] || []
        });
      } else {
        // Generate new predictions
        const { data, error: functionError } = await supabase.functions.invoke('generate-predictions', {
          body: { metal }
        });

        if (functionError) throw functionError;

        if (data?.predictions) {
          const formattedData = data.predictions.map((p: any, index: number) => {
            const date = new Date();
            date.setDate(date.getDate() + index + 1);
            return {
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              actual: null,
              predicted: p.price,
              confidence_high: p.confidence_high,
              confidence_low: p.confidence_low,
            };
          });

          setPredictions(formattedData);
          setAnalysis({
            confidence_score: data.confidence_score,
            reasoning: data.reasoning,
            key_factors: data.key_factors || [],
            sentiment: data.sentiment || 'neutral',
            sources: data.sources || []
          });
        }
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (metal) {
      fetchPredictions();
    }
  }, [metal]);

  return { predictions, analysis, isLoading, error, refetch: fetchPredictions };
};