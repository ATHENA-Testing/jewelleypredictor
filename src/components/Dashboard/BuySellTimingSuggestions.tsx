import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, AlertCircle, Sparkles, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface BuySellTimingSuggestionsProps {
  suggestions: TimingSuggestion[];
  isLoading?: boolean;
}

export const BuySellTimingSuggestions = ({ suggestions, isLoading }: BuySellTimingSuggestionsProps) => {
  const getActionStyle = (action: string) => {
    switch (action) {
      case "BUY":
        return "bg-success/20 text-success border-success/30";
      case "SELL":
        return "bg-danger/20 text-danger border-danger/30";
      default:
        return "bg-warning/20 text-warning border-warning/30";
    }
  };

  const getRiskStyle = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-success/10 text-success";
      case "high":
        return "bg-danger/10 text-danger";
      default:
        return "bg-warning/10 text-warning";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-danger" />;
      default:
        return <Target className="w-4 h-4 text-warning" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card border-2 border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-40 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        <h3 className="text-lg font-semibold text-foreground">AI Buy/Sell Timing Suggestions</h3>
        <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/20">
          AI Analysis
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-4 bg-background/50 rounded-lg border-2 border-border hover:border-primary/50 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-bold text-foreground">{suggestion.metal}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {getTrendIcon(suggestion.currentTrend)}
                  <span className="text-xs text-muted-foreground capitalize">{suggestion.currentTrend} trend</span>
                </div>
              </div>
              <Badge className={cn("text-sm font-bold", getActionStyle(suggestion.action))}>
                {suggestion.action}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Best Time:</span>
                <span className="text-foreground font-medium">{suggestion.bestTimeframe}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Target Date:</span>
                <span className="text-foreground font-medium">{suggestion.expectedDate}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 py-2">
                <div className="text-center p-2 bg-card/50 rounded">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-sm font-bold text-foreground">₹{suggestion.currentPrice.toFixed(2)}</p>
                </div>
                <div className="text-center p-2 bg-card/50 rounded">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className={cn(
                    "text-sm font-bold",
                    suggestion.targetPrice > suggestion.currentPrice ? "text-success" : "text-danger"
                  )}>
                    ₹{suggestion.targetPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge className={getRiskStyle(suggestion.riskLevel)}>
                  {suggestion.riskLevel.toUpperCase()} RISK
                </Badge>
                <span className="text-sm font-bold text-primary">{suggestion.confidence}% confidence</span>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Reasons:</p>
                <ul className="space-y-1">
                  {suggestion.reasoning.slice(0, 2).map((reason, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
        <p className="text-xs text-primary font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-pulse" />
          Suggestions based on technical analysis, market trends, historical patterns, and real-time data from multiple sources
        </p>
      </div>
    </Card>
  );
};
