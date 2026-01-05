import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export const useTechnicalIndicators = (metal: string) => {
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndicators = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch price history to calculate technical indicators
      const { data: priceHistory, error: historyError } = await supabase
        .from('metal_prices_history')
        .select('*')
        .eq('metal', metal)
        .order('recorded_at', { ascending: false })
        .limit(30);

      if (historyError) throw historyError;

      // Fetch latest market analysis for sentiment
      const { data: analysis, error: analysisError } = await supabase
        .from('market_analysis')
        .select('*')
        .eq('metal', metal)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (priceHistory && priceHistory.length > 0) {
        const prices = priceHistory.map(p => p.price_per_gram).reverse();
        const latestPrice = prices[prices.length - 1];
        
        // Calculate RSI (simplified)
        let gains = 0, losses = 0;
        for (let i = 1; i < prices.length; i++) {
          const change = prices[i] - prices[i - 1];
          if (change > 0) gains += change;
          else losses += Math.abs(change);
        }
        const avgGain = gains / 14;
        const avgLoss = losses / 14 || 1;
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        // Calculate Simple Moving Average (SMA)
        const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        // Calculate price momentum
        const momentum = ((latestPrice - prices[0]) / prices[0]) * 100;
        
        // Calculate volatility (standard deviation)
        const mean = sma;
        const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
        const volatility = Math.sqrt(avgSquaredDiff);
        const volatilityPercent = (volatility / mean) * 100;

        // Determine signals
        const rsiSignal: 'bullish' | 'bearish' | 'neutral' = 
          rsi > 70 ? 'bearish' : rsi < 30 ? 'bullish' : 'neutral';
        const smaSignal: 'bullish' | 'bearish' | 'neutral' = 
          latestPrice > sma ? 'bullish' : latestPrice < sma ? 'bearish' : 'neutral';
        const momentumSignal: 'bullish' | 'bearish' | 'neutral' = 
          momentum > 2 ? 'bullish' : momentum < -2 ? 'bearish' : 'neutral';
        const volatilitySignal: 'bullish' | 'bearish' | 'neutral' = 
          volatilityPercent > 5 ? 'bearish' : volatilityPercent < 2 ? 'bullish' : 'neutral';

        setIndicators([
          {
            name: "RSI (14)",
            value: Math.min(100, Math.max(0, rsi)),
            signal: rsiSignal,
            description: rsi > 70 ? "Overbought - potential reversal" : 
                        rsi < 30 ? "Oversold - potential buying opportunity" :
                        "Momentum within normal range"
          },
          {
            name: "Moving Average (30)",
            value: sma,
            signal: smaSignal,
            description: latestPrice > sma ? 
              "Price trading above moving average - bullish trend" :
              "Price trading below moving average - bearish trend"
          },
          {
            name: "Momentum",
            value: Math.abs(momentum),
            signal: momentumSignal,
            description: `${momentum > 0 ? 'Positive' : 'Negative'} momentum of ${momentum.toFixed(2)}% over period`
          },
          {
            name: "Volatility",
            value: Math.min(100, volatilityPercent * 10),
            signal: volatilitySignal,
            description: `${volatilityPercent.toFixed(2)}% price volatility - ${volatilityPercent > 5 ? 'High risk' : 'Stable market'}`
          }
        ]);
      } else {
        // Fallback indicators when no data
        setIndicators([
          { name: "RSI (14)", value: 50, signal: 'neutral', description: "Awaiting market data" },
          { name: "Moving Average", value: 0, signal: 'neutral', description: "Awaiting market data" },
          { name: "Momentum", value: 0, signal: 'neutral', description: "Awaiting market data" },
          { name: "Volatility", value: 50, signal: 'neutral', description: "Awaiting market data" }
        ]);
      }
    } catch (err) {
      console.error('Error fetching technical indicators:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch indicators');
    } finally {
      setIsLoading(false);
    }
  }, [metal]);

  useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators]);

  return { indicators, isLoading, error, refetch: fetchIndicators };
};
