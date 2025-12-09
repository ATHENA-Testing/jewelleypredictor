import { useState } from "react";
import { MetalPriceCard } from "@/components/Dashboard/MetalPriceCard";
import { TechnicalIndicators } from "@/components/Dashboard/TechnicalIndicators";
import { AlertConfiguration } from "@/components/Dashboard/AlertConfiguration";
import { MarketNews } from "@/components/Dashboard/MarketNews";
import { YearlyPrediction } from "@/components/Dashboard/YearlyPrediction";
import { AIRecommendations } from "@/components/Dashboard/AIRecommendations";
import { CityRatesTable } from "@/components/Dashboard/CityRatesTable";
import { BuySellTimingSuggestions } from "@/components/Dashboard/BuySellTimingSuggestions";
import { HistoricalDataTable } from "@/components/Dashboard/HistoricalDataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { useMarketAnalysis } from "@/hooks/useMarketAnalysis";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";
import { useBuySellSuggestions } from "@/hooks/useBuySellSuggestions";
import { MarketAnalysisCard } from "@/components/Dashboard/MarketAnalysisCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";


const TECHNICAL_INDICATORS = [
  { name: "RSI (14)", value: 65.4, signal: "bullish" as const, description: "Momentum indicator suggesting upward pressure" },
  { name: "MACD", value: 12.8, signal: "bullish" as const, description: "Trend following momentum indicator shows buy signal" },
  { name: "Moving Average (50)", value: 2038.2, signal: "bullish" as const, description: "Price trading above 50-day moving average" },
  { name: "Bollinger Bands", value: 78.5, signal: "neutral" as const, description: "Price within normal volatility range" },
];

const Index = () => {
  const [selectedMetal, setSelectedMetal] = useState("Gold 24K");
  const { metals, isLoading, error, lastUpdate, refetch } = useMetalPrices();
  const { analysis: marketAnalysis, isLoading: marketLoading, refetch: refetchMarketAnalysis } = useMarketAnalysis(selectedMetal);
  const { recommendations, isLoading: recsLoading } = useAIRecommendations();
  const { suggestions, isLoading: suggestionsLoading } = useBuySellSuggestions();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Create base prices map for city rates table
  const basePrices: Record<string, number> = {};
  metals.forEach(metal => {
    basePrices[metal.metal] = metal.pricePerGram;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header 
        lastUpdate={lastUpdate}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Market News Section - Moved to top with faster scroll */}
        <div className="mb-8">
          <MarketNews />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Metal Price Cards - Now 6 cards including Diamond */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
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

        {/* AI Recommendations - Flash Scrolling Section */}
        <div className="mb-8">
          {recsLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <AIRecommendations recommendations={recommendations} />
          )}
        </div>

        {/* AI Buy/Sell Timing Suggestions */}
        <div className="mb-8">
          <BuySellTimingSuggestions suggestions={suggestions} isLoading={suggestionsLoading} />
        </div>

        {/* 365-Day Prediction Section */}
        <div className="mb-8">
          <YearlyPrediction />
        </div>

        {/* City/Region Wise Rates Table */}
        <div className="mb-8">
          <CityRatesTable basePrices={basePrices} isLoading={isLoading} />
        </div>

        {/* Historical Data Table with Reinforcement Learning */}
        <div className="mb-8">
          <HistoricalDataTable />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="technical" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 bg-card border border-border">
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

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
            <div className="grid grid-cols-1 gap-6">
              <MarketAnalysisCard 
                analysis={marketAnalysis} 
                isLoading={marketLoading}
                onRefresh={refetchMarketAnalysis}
              />
            </div>
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
              <div className="text-3xl font-bold text-success mb-2">6</div>
              <p className="text-sm text-muted-foreground">Metals & Gems Tracked</p>
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
