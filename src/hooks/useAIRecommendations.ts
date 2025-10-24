import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Recommendation {
  metal: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  currentPrice: number;
  targetPrice: number;
  reasoning: string;
  timeframe: string;
  sentiment: "bullish" | "bearish" | "neutral";
}

export const useAIRecommendations = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);

      // Fetch latest predictions and analysis for all metals
      const metals = ['Gold', 'Silver', 'Platinum', 'Palladium'];
      const recs: Recommendation[] = [];

      for (const metal of metals) {
        // Get latest prediction
        const { data: predictions } = await supabase
          .from('metal_predictions')
          .select('*')
          .eq('metal', metal)
          .gte('prediction_date', new Date().toISOString().split('T')[0])
          .order('prediction_date', { ascending: true })
          .limit(1);

        // Get latest analysis
        const { data: analysis } = await supabase
          .from('market_analysis')
          .select('*')
          .eq('metal', metal)
          .order('created_at', { ascending: false })
          .limit(1);

        if (predictions && predictions.length > 0 && analysis && analysis.length > 0) {
          const pred = predictions[0];
          const currentPrice = parseFloat(pred.predicted_price.toString());
          const confidence = parseFloat(pred.confidence_score.toString());
          const sentiment = analysis[0].sentiment as "bullish" | "bearish" | "neutral";

          // Calculate target price (5 days out)
          const { data: futurePrice } = await supabase
            .from('metal_predictions')
            .select('predicted_price')
            .eq('metal', metal)
            .gte('prediction_date', new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('prediction_date', { ascending: true })
            .limit(1);

          const targetPrice = futurePrice && futurePrice.length > 0 
            ? parseFloat(futurePrice[0].predicted_price.toString())
            : currentPrice * (sentiment === 'bullish' ? 1.03 : sentiment === 'bearish' ? 0.97 : 1.0);

          // Determine action based on sentiment and confidence
          let action: "BUY" | "SELL" | "HOLD" = "HOLD";
          if (confidence > 70) {
            if (sentiment === 'bullish' && targetPrice > currentPrice) {
              action = "BUY";
            } else if (sentiment === 'bearish' && targetPrice < currentPrice) {
              action = "SELL";
            }
          }

          const priceChange = ((targetPrice - currentPrice) / currentPrice) * 100;

          recs.push({
            metal,
            action,
            confidence,
            currentPrice,
            targetPrice,
            reasoning: action === "BUY" 
              ? `Strong ${sentiment} signals suggest ${metal} could rise by ${priceChange.toFixed(1)}% in the next 5 days. ${pred.reasoning.substring(0, 100)}...`
              : action === "SELL"
              ? `Market analysis indicates potential ${Math.abs(priceChange).toFixed(1)}% decline. Consider booking profits. ${pred.reasoning.substring(0, 100)}...`
              : `Current market conditions suggest maintaining positions. Monitor for breakout signals.`,
            timeframe: "5-day outlook",
            sentiment
          });
        }
      }

      // Sort by confidence (highest first)
      recs.sort((a, b) => b.confidence - a.confidence);
      setRecommendations(recs);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    
    // Refresh every 4 hours
    const interval = setInterval(fetchRecommendations, 4 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { recommendations, isLoading, refetch: fetchRecommendations };
};
