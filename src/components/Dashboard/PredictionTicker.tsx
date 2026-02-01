import { useEffect, useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

interface PredictionItem {
  metal: string;
  currentPrice: number;
  predictedPrice: number;
  change: number;
  changePercent: number;
  confidence: number;
}

export const PredictionTicker = () => {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        // Get current rates
        const { data: currentRates } = await supabase
          .from('manual_market_rates')
          .select('metal, price_per_gram');

        // Get tomorrow's predictions
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const { data: tomorrowPredictions } = await supabase
          .from('metal_predictions')
          .select('metal, predicted_price, confidence_score')
          .eq('prediction_date', tomorrowStr);

        if (currentRates && tomorrowPredictions) {
          const items: PredictionItem[] = currentRates
            .filter(rate => {
              const prediction = tomorrowPredictions.find(p => p.metal === rate.metal);
              return prediction !== undefined;
            })
            .map(rate => {
              const prediction = tomorrowPredictions.find(p => p.metal === rate.metal);
              const currentPrice = Number(rate.price_per_gram);
              const predictedPrice = Number(prediction?.predicted_price || currentPrice);
              const change = predictedPrice - currentPrice;
              const changePercent = (change / currentPrice) * 100;

              return {
                metal: rate.metal,
                currentPrice,
                predictedPrice,
                change,
                changePercent,
                confidence: Number(prediction?.confidence_score || 85),
              };
            });

          setPredictions(items);
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  const tickerContent = useMemo(() => {
    if (predictions.length === 0) return null;

    return predictions.map((item, index) => (
      <div
        key={item.metal}
        className="inline-flex items-center gap-2 px-4 py-1 whitespace-nowrap"
      >
        <span className="font-semibold text-foreground">{item.metal}</span>
        <span className="text-muted-foreground">Today:</span>
        <span className="font-medium text-foreground">{formatPrice(item.currentPrice)}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-muted-foreground">Tomorrow:</span>
        <span className={cn(
          "font-bold",
          item.change > 0 ? "text-success" : item.change < 0 ? "text-destructive" : "text-foreground"
        )}>
          {formatPrice(item.predictedPrice)}
        </span>
        {item.change !== 0 && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            item.change > 0 ? "text-success" : "text-destructive"
          )}>
            {item.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {item.change > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
          </span>
        )}
        <span className="text-xs text-muted-foreground">({item.confidence}% confidence)</span>
        {index < predictions.length - 1 && (
          <span className="mx-4 text-border">|</span>
        )}
      </div>
    ));
  }, [predictions, formatPrice]);

  if (isLoading) {
    return (
      <div className="w-full bg-card border-b border-border py-2 px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Loading predictions...</span>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-primary/5 via-card to-primary/5 border-b border-border overflow-hidden">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-primary px-3 py-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
          <span className="text-xs font-bold text-primary-foreground uppercase tracking-wide">
            AI Predictions
          </span>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="animate-scroll-left inline-flex items-center py-2">
            {/* Duplicate content for seamless loop */}
            {tickerContent}
            {tickerContent}
          </div>
        </div>
      </div>
    </div>
  );
};
