import { useState, useEffect } from "react";
import { MetalPriceCard } from "@/components/Dashboard/MetalPriceCard";
import { PredictionChart } from "@/components/Dashboard/PredictionChart";
import { TechnicalIndicators } from "@/components/Dashboard/TechnicalIndicators";
import { AlertConfiguration } from "@/components/Dashboard/AlertConfiguration";
import { CurrencyConverter } from "@/components/Dashboard/CurrencyConverter";
import { MarketNews } from "@/components/Dashboard/MarketNews";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RefreshCw, Activity } from "lucide-react";
import { useCurrency, EXCHANGE_RATES } from "@/contexts/CurrencyContext";

// Mock data generators
const generatePredictionData = (basePrice: number) => {
  const data = [];
  let currentPrice = basePrice;
  
  for (let i = 0; i < 10; i++) {
    const change = (Math.random() - 0.5) * 50;
    currentPrice += change;
    const confidence = Math.random() * 30 + 10;
    
    data.push({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: i < 3 ? currentPrice : null,
      predicted: currentPrice,
      confidence_high: currentPrice + confidence,
      confidence_low: currentPrice - confidence,
    });
  }
  
  return data;
};

const INITIAL_METALS = [
  { metal: "Gold", symbol: "XAU/USD", price: 2045.50, change: 12.30, changePercent: 0.61, unit: "per oz", colorClass: "border-gold/50 hover:border-gold" },
  { metal: "Silver", symbol: "XAG/USD", price: 24.85, change: -0.15, changePercent: -0.60, unit: "per oz", colorClass: "border-silver/50 hover:border-silver" },
  { metal: "Platinum", symbol: "XPT/USD", price: 945.20, change: 5.80, changePercent: 0.62, unit: "per oz", colorClass: "border-platinum/50 hover:border-platinum" },
  { metal: "Palladium", symbol: "XPD/USD", price: 1235.40, change: -8.20, changePercent: -0.66, unit: "per oz", colorClass: "border-palladium/50 hover:border-palladium" },
];

const TECHNICAL_INDICATORS = [
  { name: "RSI (14)", value: 65.4, signal: "bullish" as const, description: "Momentum indicator suggesting upward pressure" },
  { name: "MACD", value: 12.8, signal: "bullish" as const, description: "Trend following momentum indicator shows buy signal" },
  { name: "Moving Average (50)", value: 2038.2, signal: "bullish" as const, description: "Price trading above 50-day moving average" },
  { name: "Bollinger Bands", value: 78.5, signal: "neutral" as const, description: "Price within normal volatility range" },
];

const Index = () => {
  const [metals, setMetals] = useState(INITIAL_METALS);
  const [selectedMetal, setSelectedMetal] = useState("Gold");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { currency, setCurrency } = useCurrency();

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetals(prevMetals => 
        prevMetals.map(metal => {
          const change = (Math.random() - 0.5) * 2;
          const newPrice = metal.price + change;
          const newChange = metal.change + change;
          const newChangePercent = (newChange / metal.price) * 100;
          
          return {
            ...metal,
            price: newPrice,
            change: newChange,
            changePercent: newChangePercent,
          };
        })
      );
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdate(new Date());
    }, 1000);
  };

  const selectedMetalData = metals.find(m => m.metal === selectedMetal);
  const predictionData = generatePredictionData(selectedMetalData?.price || 2000);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">MetalPredict Pro</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Jewellery Rate Predictions</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(EXCHANGE_RATES).map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {curr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-success animate-pulse" />
                <span className="text-xs">Live Market Data</span>
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
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

      <main className="container mx-auto px-4 py-8">
        {/* Metal Price Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metals.map((metal) => (
            <div key={metal.metal} onClick={() => setSelectedMetal(metal.metal)} className="cursor-pointer">
              <MetalPriceCard {...metal} />
            </div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="predictions" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-4 bg-card border border-border">
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PredictionChart data={predictionData} metal={selectedMetal} />
              </div>
              <div className="space-y-6">
                <CurrencyConverter />
                <MarketNews />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="technical" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TechnicalIndicators metal={selectedMetal} indicators={TECHNICAL_INDICATORS} />
              <MarketNews />
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertConfiguration />
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <CurrencyConverter />
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-gradient-card border-2 border-border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">98.5%</div>
              <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-success mb-2">4</div>
              <p className="text-sm text-muted-foreground">Metals Tracked</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-warning mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Live Market Data</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
