import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TimingSuggestion {
  metal: string;
  action: "BUY" | "SELL" | "HOLD";
  bestTimeframe: string;
  confidence: number;
  currentTrend: "up" | "down" | "stable";
  reasoning: string[];
  targetPrice: number;
  currentPrice: number;
  expectedDate: string;
  riskLevel: "low" | "medium" | "high";
}

interface CurrentPrices {
  [metal: string]: number;
}

export const useBuySellSuggestions = (currentPrices?: CurrentPrices) => {
  const [suggestions, setSuggestions] = useState<TimingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch latest prices from price history if not provided
      let livePrices: CurrentPrices = currentPrices || {};
      
      if (!currentPrices || Object.keys(currentPrices).length === 0) {
        const { data: latestPrices } = await supabase
          .from('metal_prices_history')
          .select('metal, price_per_gram')
          .order('recorded_at', { ascending: false })
          .limit(10);
        
        if (latestPrices) {
          latestPrices.forEach(p => {
            if (!livePrices[p.metal]) {
              livePrices[p.metal] = p.price_per_gram;
            }
          });
        }
      }

      // Fetch predictions and market analysis
      const { data: predictions } = await supabase
        .from('metal_predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      const { data: analysis } = await supabase
        .from('market_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: priceHistory } = await supabase
        .from('metal_prices_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(50);

      // Generate AI-based suggestions from the data
      const metals = ["Gold 24K", "Gold 22K", "Silver", "Platinum", "Palladium", "Diamond"];
      const generatedSuggestions: TimingSuggestion[] = metals.map(metal => {
        const metalPredictions = predictions?.filter(p => p.metal === metal) || [];
        const metalAnalysis = analysis?.find(a => a.metal === metal);
        const metalHistory = priceHistory?.filter(p => p.metal === metal) || [];
        
        // Use live prices first, then fall back to history
        const latestPrice = livePrices[metal] || metalHistory[0]?.price_per_gram || 0;
        const previousPrice = metalHistory[5]?.price_per_gram || latestPrice * 0.99;
        
        // Calculate trend from history
        const trend: "up" | "down" | "stable" = 
          latestPrice > previousPrice * 1.01 ? "up" : 
          latestPrice < previousPrice * 0.99 ? "down" : "stable";
        
        // Determine action based on trend and predictions
        const avgPrediction = metalPredictions.length > 0 
          ? metalPredictions.reduce((sum, p) => sum + p.predicted_price, 0) / metalPredictions.length 
          : latestPrice * 1.05;
        
        const priceChange = latestPrice > 0 ? ((avgPrediction - latestPrice) / latestPrice) * 100 : 0;
        
        let action: "BUY" | "SELL" | "HOLD";
        let bestTimeframe: string;
        let confidence: number;
        let riskLevel: "low" | "medium" | "high";
        
        if (priceChange > 3) {
          action = "BUY";
          bestTimeframe = "Within 1-2 weeks";
          confidence = Math.min(85, 70 + priceChange);
          riskLevel = priceChange > 8 ? "high" : "medium";
        } else if (priceChange < -3) {
          action = "SELL";
          bestTimeframe = "Within 3-5 days";
          confidence = Math.min(85, 70 + Math.abs(priceChange));
          riskLevel = Math.abs(priceChange) > 8 ? "high" : "medium";
        } else {
          action = "HOLD";
          bestTimeframe = "Wait for better signals";
          confidence = 65;
          riskLevel = "low";
        }
        
        const sentiment = metalAnalysis?.sentiment || "neutral";
        const keyFactors = metalAnalysis?.key_factors as string[] || [];
        
        // Generate reasoning
        const reasoning: string[] = [];
        if (trend === "up") reasoning.push("Upward price momentum detected");
        if (trend === "down") reasoning.push("Downward correction in progress");
        if (sentiment === "bullish") reasoning.push("Market sentiment is bullish");
        if (sentiment === "bearish") reasoning.push("Market sentiment is bearish");
        if (keyFactors.length > 0) reasoning.push(keyFactors[0]);
        reasoning.push(`${Math.abs(priceChange).toFixed(1)}% price movement expected`);
        
        // Calculate expected date
        const today = new Date();
        const daysAhead = action === "SELL" ? 5 : action === "BUY" ? 14 : 30;
        const expectedDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        
        return {
          metal,
          action,
          bestTimeframe,
          confidence: Math.round(confidence),
          currentTrend: trend,
          reasoning,
          targetPrice: avgPrediction,
          currentPrice: latestPrice,
          expectedDate: expectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          riskLevel
        };
      });

      setSuggestions(generatedSuggestions);
    } catch (error) {
      console.error('Error fetching buy/sell suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPrices]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return { suggestions, isLoading, refetch: fetchSuggestions };
};
