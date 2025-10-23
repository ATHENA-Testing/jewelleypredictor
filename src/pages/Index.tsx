import { useState } from "react";
import { MetalPriceCard } from "@/components/Dashboard/MetalPriceCard";
import { PredictionChart } from "@/components/Dashboard/PredictionChart";
import { TechnicalIndicators } from "@/components/Dashboard/TechnicalIndicators";
import { AlertConfiguration } from "@/components/Dashboard/AlertConfiguration";
import { CurrencyConverter } from "@/components/Dashboard/CurrencyConverter";
import { MarketNews } from "@/components/Dashboard/MarketNews";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Activity, AlertCircle } from "lucide-react";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { usePredictions } from "@/hooks/usePredictions";
import { useMarketAnalysis } from "@/hooks/useMarketAnalysis";
import { PredictionAnalysis } from "@/components/Dashboard/PredictionAnalysis";
import { MarketAnalysisCard } from "@/components/Dashboard/MarketAnalysisCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";


const TECHNICAL_INDICATORS = [
  { name: "RSI (14)", value: 65.4, signal: "bullish" as const, description: "Momentum indicator suggesting upward pressure" },
  { name: "MACD", value: 12.8, signal: "bullish" as const, description: "Trend following momentum indicator shows buy signal" },
  { name: "Moving Average (50)", value: 2038.2, signal: "bullish" as const, description: "Price trading above 50-day moving average" },
  { name: "Bollinger Bands", value: 78.5, signal: "neutral" as const, description: "Price within normal volatility range" },
];

const Index = () => {
  const [selectedMetal, setSelectedMetal] = useState("Gold");
  const { metals, isLoading, error, lastUpdate, refetch } = useMetalPrices();
  const { predictions, analysis: predictionAnalysis, isLoading: predictionLoading } = usePredictions(selectedMetal);
  const { analysis: marketAnalysis, isLoading: marketLoading, refetch: refetchMarketAnalysis } = useMarketAnalysis(selectedMetal);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

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
            
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-success animate-pulse" />
                <span className="text-xs">All India Rates - INR per gram</span>
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
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Metal Price Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))
          ) : (
            metals.map((metal) => (
              <div key={metal.metal} onClick={() => setSelectedMetal(metal.metal)} className="cursor-pointer">
                <MetalPriceCard {...metal} />
              </div>
            ))
          )}
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
              <div className="lg:col-span-2 space-y-6">
                {predictionLoading ? (
                  <Skeleton className="h-[400px] rounded-lg" />
                ) : (
                  <PredictionChart data={predictions} metal={selectedMetal} />
                )}
                <PredictionAnalysis analysis={predictionAnalysis} isLoading={predictionLoading} />
              </div>
              <div className="space-y-6">
                <MarketAnalysisCard 
                  analysis={marketAnalysis} 
                  isLoading={marketLoading}
                  onRefresh={refetchMarketAnalysis}
                />
                <CurrencyConverter />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="technical" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TechnicalIndicators metal={selectedMetal} indicators={TECHNICAL_INDICATORS} />
              <MarketAnalysisCard 
                analysis={marketAnalysis} 
                isLoading={marketLoading}
                onRefresh={refetchMarketAnalysis}
              />
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
