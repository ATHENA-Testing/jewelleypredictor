import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface AIRecommendationsProps {
  recommendations: Recommendation[];
}

export const AIRecommendations = ({ recommendations }: AIRecommendationsProps) => {
  const getActionStyle = (action: string) => {
    switch (action) {
      case "BUY":
        return "bg-success/20 text-success border-success/30 animate-pulse";
      case "SELL":
        return "bg-danger/20 text-danger border-danger/30 animate-pulse";
      default:
        return "bg-warning/20 text-warning border-warning/30";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "BUY":
        return <TrendingUp className="w-5 h-5" />;
      case "SELL":
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        <h3 className="text-lg font-semibold text-foreground">AI Trading Signals</h3>
        <Badge variant="outline" className="ml-auto">Live</Badge>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="relative p-4 bg-background/50 rounded-lg border-2 border-border hover:border-primary/50 transition-all duration-300"
          >
            {/* Flash effect for strong signals */}
            {rec.confidence > 80 && (
              <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-lg" />
            )}

            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge className={cn("text-base font-bold px-3 py-1", getActionStyle(rec.action))}>
                    {getActionIcon(rec.action)}
                    <span className="ml-2">{rec.action}</span>
                  </Badge>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">{rec.metal}</h4>
                    <p className="text-xs text-muted-foreground">{rec.timeframe}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                  <div className="text-2xl font-bold text-primary">{rec.confidence}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-3 bg-card/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                  <div className="text-lg font-bold text-foreground">₹{rec.currentPrice.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-card/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Target Price</div>
                  <div className={cn(
                    "text-lg font-bold",
                    rec.targetPrice > rec.currentPrice ? "text-success" : "text-danger"
                  )}>
                    ₹{rec.targetPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">{rec.reasoning}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
        <p className="text-xs text-primary font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-pulse" />
          AI-powered recommendations updated every 4 hours based on market analysis and predictive models
        </p>
      </div>
    </Card>
  );
};
