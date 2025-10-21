import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MetalData {
  metal: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  colorClass: string;
  timestamp?: number;
}

const METAL_COLOR_CLASSES: Record<string, string> = {
  Gold: "border-gold/50 hover:border-gold",
  Silver: "border-silver/50 hover:border-silver",
  Platinum: "border-platinum/50 hover:border-platinum",
  Palladium: "border-palladium/50 hover:border-palladium",
};

export const useMetalPrices = () => {
  const [metals, setMetals] = useState<MetalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchPrices = async () => {
    try {
      setError(null);
      const { data, error: functionError } = await supabase.functions.invoke('fetch-metal-prices');

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
        setError("Using cached prices - live data temporarily unavailable");
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

    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);

    return () => clearInterval(interval);
  }, []);

  return { metals, isLoading, error, lastUpdate, refetch: fetchPrices };
};
