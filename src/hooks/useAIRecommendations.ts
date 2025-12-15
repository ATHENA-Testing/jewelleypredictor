import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const METALS = ['Gold 24K', 'Gold 22K', 'Silver', 'Platinum', 'Palladium', 'Diamond'];

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

interface CurrentPrices {
  [metal: string]: number;
}

export const useAIRecommendations = (currentPrices?: CurrentPrices) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch latest prices from price history if not provided
      let livePrices: CurrentPrices = currentPrices || {};
      
      if (!currentPrices || Object.keys(currentPrices).length === 0) {
        const { data: priceHistory } = await supabase
          .from('metal_prices_history')
          .select('metal, price_per_gram')
          .order('recorded_at', { ascending: false })
          .limit(10);
        
        if (priceHistory) {
          priceHistory.forEach(p => {
            if (!livePrices[p.metal]) {
              livePrices[p.metal] = p.price_per_gram;
            }
          });
        }
      }

      const recs: Recommendation[] = [];

      for (const metal of METALS) {
        // Get current live price
        const currentPrice = livePrices[metal] || 0;
        if (currentPrice === 0) continue;

        // Get latest prediction for future prices
        const { data: predictions } = await supabase
          .from('metal_predictions')
          .select('*')
          .eq('metal', metal)
          .gte('prediction_date', new Date().toISOString().split('T')[0])
          .order('prediction_date', { ascending: true })
          .limit(5);

        // Get latest analysis for sentiment
        const { data: analysis } = await supabase
          .from('market_analysis')
          .select('*')
          .eq('metal', metal)
          .order('created_at', { ascending: false })
          .limit(1);

        const sentiment = (analysis?.[0]?.sentiment as "bullish" | "bearish" | "neutral") || "neutral";
        const confidence = predictions?.[0]?.confidence_score ? parseFloat(predictions[0].confidence_score.toString()) : 70;

        // Calculate target price (5 days out prediction or estimate)
        let targetPrice = currentPrice;
        if (predictions && predictions.length >= 5) {
          targetPrice = parseFloat(predictions[4].predicted_price.toString());
        } else if (predictions && predictions.length > 0) {
          targetPrice = parseFloat(predictions[predictions.length - 1].predicted_price.toString());
        } else {
          // Estimate based on sentiment
          targetPrice = currentPrice * (sentiment === 'bullish' ? 1.03 : sentiment === 'bearish' ? 0.97 : 1.0);
        }

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
        const reasoning = predictions?.[0]?.reasoning || "";

        recs.push({
          metal,
          action,
          confidence,
          currentPrice,
          targetPrice,
          reasoning: action === "BUY" 
            ? `Strong ${sentiment} signals suggest ${metal} could rise by ${priceChange.toFixed(1)}% in the next 5 days. ${reasoning.substring(0, 100)}...`
            : action === "SELL"
            ? `Market analysis indicates potential ${Math.abs(priceChange).toFixed(1)}% decline. Consider booking profits. ${reasoning.substring(0, 100)}...`
            : `Current market conditions suggest maintaining positions. Monitor for breakout signals.`,
          timeframe: "5-day outlook",
          sentiment
        });
      }

      // Sort by confidence (highest first)
      recs.sort((a, b) => b.confidence - a.confidence);
      setRecommendations(recs);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPrices]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, isLoading, refetch: fetchRecommendations };
};
