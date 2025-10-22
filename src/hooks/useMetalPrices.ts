import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MetalData {
  metal: string;
  symbol: string;
  price: number;
  pricePerGram: number;
  change: number;
  changePercent: number;
  unit: string;
  colorClass: string;
  timestamp?: number;
  location?: string;
}

const METAL_COLOR_CLASSES: Record<string, string> = {
  Gold: "border-gold/50 hover:border-gold",
  Silver: "border-silver/50 hover:border-silver",
  Platinum: "border-platinum/50 hover:border-platinum",
  Palladium: "border-palladium/50 hover:border-palladium",
};

export const useMetalPrices = (location?: string) => {
  const [metals, setMetals] = useState<MetalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchPrices = async () => {
    try {
      setError(null);
      const { data, error: functionError } = await supabase.functions.invoke('fetch-metal-prices', {
        body: { location }
      });

      if (functionError) throw functionError;

      if (data?.metals) {
        const metalsWithColors = data.metals.map((metal: MetalData) => ({
          ...metal,
          colorClass: METAL_COLOR_CLASSES[metal.metal] || "border-border/50",
        }));
        setMetals(metalsWithColors);
        setLastUpdate(new Date());
      }

      if (data?.usingFallback) {
        setError("Using approximate prices - live data temporarily unavailable");
      }
    } catch (err) {
      console.error('Error fetching metal prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();

    // Refresh prices every 5 minutes (API has limited free tier)
    const interval = setInterval(fetchPrices, 300000);

    return () => clearInterval(interval);
  }, [location]);

  return { metals, isLoading, error, lastUpdate, refetch: fetchPrices };
};
