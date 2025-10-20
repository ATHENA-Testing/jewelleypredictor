import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Indicator {
  name: string;
  value: number;
  signal: "bullish" | "bearish" | "neutral";
  description: string;
}

interface TechnicalIndicatorsProps {
  metal: string;
  indicators: Indicator[];
}

export const TechnicalIndicators = ({ metal, indicators }: TechnicalIndicatorsProps) => {
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

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Technical Analysis</h3>
        <p className="text-sm text-muted-foreground">{metal} market indicators</p>
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
              value={Math.min(100, (indicator.value / 100) * 100)} 
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
            {indicators.filter(i => i.signal === "bullish").length > indicators.filter(i => i.signal === "bearish").length ? (
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
