import { TrendingUp, TrendingDown, Clock, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface MetalPriceCardProps {
  metal: string;
  symbol: string;
  price: number;
  pricePerGram: number;
  change: number;
  changePercent: number;
  unit: string;
  colorClass: string;
  source?: string;
  lastUpdated?: string;
}

export const MetalPriceCard = ({
  metal,
  symbol,
  pricePerGram,
  change,
  changePercent,
  unit,
  colorClass,
  source = "Manual",
  lastUpdated,
}: MetalPriceCardProps) => {
  const { formatPrice } = useCurrency();
  const isPositive = change >= 0;
  const changePerGram = change / 31.1035;

  const formattedTime = lastUpdated 
    ? format(new Date(lastUpdated), "dd MMM, hh:mm a")
    : format(new Date(), "dd MMM, hh:mm a");

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all duration-300 hover:shadow-glow hover:scale-105",
      colorClass
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full" 
           style={{ background: `hsl(var(--${metal.toLowerCase().replace(' ', '-')}))` }} />
      
      <div className="relative p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">{metal}</h3>
            <p className="text-xs text-muted-foreground mt-1">{symbol}</p>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
            isPositive ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {changePercent.toFixed(2)}%
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-3xl font-bold text-foreground">
            {formatPrice(pricePerGram)}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-sm font-medium",
              isPositive ? "text-success" : "text-danger"
            )}>
              {isPositive ? "+" : ""}{formatPrice(Math.abs(changePerGram))}
            </span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>

        {/* Location & Last Updated */}
        {/* Location & Last Updated */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-primary" />
              <span className="font-semibold text-primary">Hyderabad</span>
            </div>
            <ConfidenceBadge lastUpdated={lastUpdated} source={source} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formattedTime}</span>
            </div>
            <span className={cn(
              "font-medium text-[10px]",
              source === "LiveChennai.com" || source === "GoodReturns.in" ? "text-success" : "text-muted-foreground"
            )}>
              {source === "LiveChennai via Firecrawl" ? "LiveChennai" :
               source === "LiveChennai.com" ? "LiveChennai" : source}
            </span>
          </div>
        </div>

      </div>
    </Card>
  );
};
