import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RefreshCw, Activity, Zap, Trash2, LogIn, LogOut, Crown, Settings } from "lucide-react";
import { useCurrency, CURRENCY_SYMBOLS } from "@/contexts/CurrencyContext";
import { useCity, INDIAN_CITIES } from "@/contexts/CityContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  lastUpdate?: Date;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showRefresh?: boolean;
  onFullRefresh?: () => void;
}

export const Header = ({ lastUpdate, isRefreshing = false, onRefresh, showRefresh = true, onFullRefresh }: HeaderProps) => {
  const { currency, setCurrency } = useCurrency();
  const { selectedCity, setSelectedCity, getCityLabel } = useCity();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [isFullRefreshing, setIsFullRefreshing] = useState(false);

  const handleFullRefresh = async () => {
    setIsFullRefreshing(true);
    toast.info("Starting full data refresh for all metals...");
    try {
      const { error } = await supabase.functions.invoke('daily-rates-refresh', { body: {} });
      if (error) {
        toast.error("Full refresh failed. Please try again.");
      } else {
        toast.success("Full refresh completed! All rates and predictions updated.");
        if (onFullRefresh) onFullRefresh();
        if (onRefresh) onRefresh();
      }
    } catch {
      toast.error("Full refresh failed.");
    } finally {
      setIsFullRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

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

            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CURRENCY_SYMBOLS).map((curr) => (
                  <SelectItem key={curr} value={curr}>{CURRENCY_SYMBOLS[curr]} {curr}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_CITIES.map((city) => (
                  <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showRefresh && (
              <>
                <Button variant="outline" size="sm" onClick={() => { localStorage.clear(); toast.success("Cache cleared!"); if (onRefresh) onRefresh(); }} title="Clear cached data">
                  <Trash2 className="w-4 h-4 mr-2" />Clear Cache
                </Button>
                {onRefresh && (
                  <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh
                  </Button>
                )}
                <Button variant="default" size="sm" onClick={handleFullRefresh} disabled={isFullRefreshing} className="bg-gradient-primary">
                  <Zap className={`w-4 h-4 mr-2 ${isFullRefreshing ? 'animate-pulse' : ''}`} />
                  {isFullRefreshing ? 'Refreshing...' : 'Full Refresh'}
                </Button>
                {lastUpdate && (
                  <span className="text-xs text-muted-foreground">Updated {lastUpdate.toLocaleTimeString()}</span>
                )}
              </>
            )}

            {/* Auth Controls */}
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                    <Settings className="w-4 h-4 mr-1" /> Admin
                  </Button>
                )}
                <Badge variant="outline" className="text-xs">
                  {user.email?.split("@")[0]}
                  {isAdmin && <Crown className="w-3 h-3 ml-1 text-warning" />}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
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
