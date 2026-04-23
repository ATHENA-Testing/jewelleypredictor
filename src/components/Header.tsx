import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Activity, LogIn, Settings, MapPin, Clock, Radio, ShieldCheck } from "lucide-react";
import { useCurrency, CURRENCY_SYMBOLS } from "@/contexts/CurrencyContext";
import { useCity, INDIAN_CITIES } from "@/contexts/CityContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  lastUpdate?: Date;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showRefresh?: boolean;
  onFullRefresh?: () => void;
}

export const Header = ({ lastUpdate, isRefreshing = false }: HeaderProps) => {
  const { currency, setCurrency } = useCurrency();
  const { selectedCity, setSelectedCity, getCityLabel, isAutoDetected } = useCity();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const formattedTime = lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm relative z-10">
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* Live status chip */}
            <Badge variant="outline" className="flex items-center gap-1.5 py-1.5">
              <Radio className={`w-3 h-3 text-success ${isRefreshing ? "animate-pulse" : ""}`} />
              <span className="text-xs font-medium">Live Market</span>
            </Badge>

            {/* Last updated chip */}
            <Badge variant="outline" className="flex items-center gap-1.5 py-1.5">
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-xs">Updated {formattedTime}</span>
            </Badge>

            {/* India scope chip */}
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 py-1.5">
              <Activity className="w-3 h-3 text-success" />
              <span className="text-xs">{getCityLabel(selectedCity)} • {currency}/g</span>
            </Badge>

            {/* Currency selector */}
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CURRENCY_SYMBOLS).map((curr) => (
                  <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* City selector with auto-detect indicator */}
            <div className="relative">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[150px] h-9 pl-8">
                  <MapPin className="w-3.5 h-3.5 text-primary absolute left-2.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_CITIES.map((city) => (
                    <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAutoDetected && (
                <span
                  className="absolute -top-1.5 -right-1.5 bg-success text-success-foreground text-[9px] px-1.5 py-0.5 rounded-full font-semibold leading-none"
                  title="Auto-detected from your location"
                >
                  AUTO
                </span>
              )}
            </div>

            {/* Verified data chip */}
            <Badge variant="outline" className="hidden md:flex items-center gap-1.5 py-1.5">
              <ShieldCheck className="w-3 h-3 text-success" />
              <span className="text-xs">Verified Sources</span>
            </Badge>

            {/* Admin entry */}
            {user && isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Settings className="w-4 h-4 mr-1" /> Admin
              </Button>
            )}

            {!user && (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                <LogIn className="w-4 h-4 mr-1" /> Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
