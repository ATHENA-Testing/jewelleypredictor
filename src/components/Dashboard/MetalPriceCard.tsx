import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetalPriceCardProps {
  metal: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  colorClass: string;
}

export const MetalPriceCard = ({
  metal,
  symbol,
  price,
  change,
  changePercent,
  unit,
  colorClass,
}: MetalPriceCardProps) => {
  const isPositive = change >= 0;

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all duration-300 hover:shadow-glow hover:scale-105",
      colorClass
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full" 
           style={{ background: `hsl(var(--${metal.toLowerCase()}))` }} />
      
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
            ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-sm font-medium",
              isPositive ? "text-success" : "text-danger"
            )}>
              {isPositive ? "+" : ""}{change.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
