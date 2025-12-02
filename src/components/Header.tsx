import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RefreshCw, Activity } from "lucide-react";
import { useCurrency, CURRENCY_SYMBOLS } from "@/contexts/CurrencyContext";
import { useCity, INDIAN_CITIES } from "@/contexts/CityContext";

interface HeaderProps {
  lastUpdate: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const Header = ({ lastUpdate, isRefreshing, onRefresh }: HeaderProps) => {
  const { currency, setCurrency } = useCurrency();
  const { selectedCity, setSelectedCity, getCityLabel } = useCity();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">MetalPredict Pro</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Jewellery Rate Predictions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-success animate-pulse" />
              <span className="text-xs">{getCityLabel(selectedCity)} Rates - {currency} per gram</span>
            </Badge>

            {/* Currency Selector */}
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CURRENCY_SYMBOLS).map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {CURRENCY_SYMBOLS[curr]} {curr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* City Selector */}
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_CITIES.map((city) => (
                  <SelectItem key={city.value} value={city.value}>
                    {city.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
