import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTechnicalIndicators } from "@/hooks/useTechnicalIndicators";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface TechnicalIndicatorsProps {
  metal: string;
  indicators?: Array<{
    name: string;
    value: number;
    signal: "bullish" | "bearish" | "neutral";
    description: string;
  }>;
}

export const TechnicalIndicators = ({ metal, indicators: propIndicators }: TechnicalIndicatorsProps) => {
  const { indicators: liveIndicators, isLoading, refetch } = useTechnicalIndicators(metal);
  
  // Use live indicators if available, otherwise fall back to prop indicators
  const indicators = liveIndicators.length > 0 ? liveIndicators : propIndicators || [];

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case "bullish":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "bearish":
        return <TrendingDown className="w-4 h-4 text-danger" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "bullish":
        return "text-success";
      case "bearish":
        return "text-danger";
      default:
        return "text-muted-foreground";
    }
  };

  if (isLoading && indicators.length === 0) {
    return (
      <Card className="p-6 bg-gradient-card border-2 border-border">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const bullishCount = indicators.filter(i => i.signal === "bullish").length;
  const bearishCount = indicators.filter(i => i.signal === "bearish").length;
  const overallBullish = bullishCount > bearishCount;
  const overallNeutral = bullishCount === bearishCount;

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Technical Analysis</h3>
          <p className="text-sm text-muted-foreground">{metal} market indicators</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="space-y-6">
        {indicators.map((indicator, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getSignalIcon(indicator.signal)}
                <span className="font-medium text-foreground">{indicator.name}</span>
              </div>
              <span className={cn("text-sm font-semibold", getSignalColor(indicator.signal))}>
                {indicator.value.toFixed(2)}
              </span>
            </div>
            <Progress 
              value={Math.min(100, Math.max(0, indicator.value))} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">{indicator.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Overall Signal</span>
          <div className="flex items-center gap-2">
            {overallNeutral ? (
              <>
                <Minus className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground font-semibold">Neutral</span>
              </>
            ) : overallBullish ? (
              <>
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-success font-semibold">Bullish</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-5 h-5 text-danger" />
                <span className="text-danger font-semibold">Bearish</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
