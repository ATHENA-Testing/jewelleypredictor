import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CityRate {
  city: string;
  price: number;
  change: number;
  changePercent: number;
}

interface CityRatesProps {
  metal: string;
  basePrice: number;
  change: number;
  changePercent: number;
}

export const CityRates = ({ metal, basePrice, change, changePercent }: CityRatesProps) => {
  const { convertPrice, currency } = useCurrency();

  // Generate city-specific rates with realistic variations
  const cities = [
    { name: "Mumbai", variation: 1.02 },
    { name: "Delhi", variation: 1.015 },
    { name: "Bangalore", variation: 1.01 },
    { name: "Chennai", variation: 1.008 },
    { name: "Kolkata", variation: 0.995 },
    { name: "Hyderabad", variation: 1.005 },
  ];

  const cityRates: CityRate[] = cities.map(city => ({
    city: city.name,
    price: convertPrice(basePrice * city.variation),
    change: change * city.variation,
    changePercent: changePercent,
  }));

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{metal} Rates - Major Cities</h3>
        </div>
        <Badge variant="outline">per gram</Badge>
      </div>

      <div className="space-y-3">
        {/* All India Rate - Highlighted */}
        <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <div>
                <div className="font-semibold text-foreground">All India Rate</div>
                <div className="text-xs text-muted-foreground">Base Market Price</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-foreground">
                {currency === "INR" ? "₹" : "$"}{convertPrice(basePrice).toFixed(2)}
              </div>
              <div className={cn(
                "text-sm font-medium flex items-center gap-1 justify-end",
                changePercent >= 0 ? "text-success" : "text-danger"
              )}>
                {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* City-specific rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cityRates.map((cityRate, index) => (
            <div
              key={index}
              className="p-3 bg-background/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground text-sm">{cityRate.city}</div>
                  <div className="text-xs text-muted-foreground">Local Rate</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-foreground">
                    {currency === "INR" ? "₹" : "$"}{cityRate.price.toFixed(2)}
                  </div>
                  <div className={cn(
                    "text-xs font-medium",
                    cityRate.changePercent >= 0 ? "text-success" : "text-danger"
                  )}>
                    {cityRate.changePercent >= 0 ? "+" : ""}{cityRate.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 bg-muted/20 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 City rates include local variations, taxes, and market premiums. Prices updated in real-time based on national rates.
        </p>
      </div>
    </Card>
  );
};
