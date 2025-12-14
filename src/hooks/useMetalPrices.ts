import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCity } from '@/contexts/CityContext';

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
  "Gold 24K": "border-gold/50 hover:border-gold",
  "Gold 22K": "border-gold/50 hover:border-gold",
  Silver: "border-silver/50 hover:border-silver",
  Platinum: "border-platinum/50 hover:border-platinum",
  Palladium: "border-palladium/50 hover:border-palladium",
  Diamond: "border-primary/50 hover:border-primary",
};

// City-specific price adjustments (percentage difference from All India base rate)
const CITY_PRICE_ADJUSTMENTS: Record<string, number> = {
  "all-india": 0,
  "mumbai": 0.15,
  "delhi": 0.10,
  "bangalore": 0.05,
  "chennai": -0.10,
  "kolkata": -0.05,
  "hyderabad": 0,
};

const CACHE_KEY = 'metal_prices_cache';
const CACHE_TIMESTAMP_KEY = 'metal_prices_cache_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  metals: MetalData[];
  timestamp: number;
}

const getCachedData = (): CachedData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (cached && timestamp) {
      const cacheTime = parseInt(timestamp, 10);
      const now = Date.now();
      if (now - cacheTime < CACHE_DURATION_MS) {
        return { metals: JSON.parse(cached), timestamp: cacheTime };
      }
    }
  } catch (e) {
    console.error('Error reading cache:', e);
  }
  return null;
};

const setCachedData = (metals: MetalData[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(metals));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.error('Error setting cache:', e);
  }
};

const shouldAutoFetch = (): boolean => {
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!cachedTimestamp) return true;
  
  const cacheTime = parseInt(cachedTimestamp, 10);
  const cacheDate = new Date(cacheTime);
  const now = new Date();
  
  return cacheDate.toDateString() !== now.toDateString();
};

export const useMetalPrices = () => {
  const [metals, setMetals] = useState<MetalData[]>([]);
  const [baseMetals, setBaseMetals] = useState<MetalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { selectedCity, getCityLabel } = useCity();

  const applyCityAdjustments = useCallback((basePrices: MetalData[], city: string): MetalData[] => {
    const adjustment = CITY_PRICE_ADJUSTMENTS[city] || 0;
    const cityLabel = getCityLabel(city);
    
    return basePrices.map(metal => ({
      ...metal,
      pricePerGram: metal.pricePerGram * (1 + adjustment / 100),
      price: metal.price * (1 + adjustment / 100),
      location: cityLabel,
    }));
  }, [getCityLabel]);

  const fetchPrices = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      setIsLoading(true);

      if (!forceRefresh) {
        const cached = getCachedData();
        if (cached && !shouldAutoFetch()) {
          console.log('Using cached metal prices');
          const metalsWithColors = cached.metals.map((metal: MetalData) => ({
            ...metal,
            colorClass: METAL_COLOR_CLASSES[metal.metal] || "border-border/50",
          }));
          setBaseMetals(metalsWithColors);
          setMetals(applyCityAdjustments(metalsWithColors, selectedCity));
          setLastUpdate(new Date(cached.timestamp));
          setIsLoading(false);
          return;
        }
      }

      console.log('Fetching fresh metal prices from API');
      const { data, error: functionError } = await supabase.functions.invoke('fetch-metal-prices', {
        body: {}
      });

      if (functionError) throw functionError;

      if (data?.metals) {
        const metalsWithColors = data.metals.map((metal: MetalData) => ({
          ...metal,
          colorClass: METAL_COLOR_CLASSES[metal.metal] || "border-border/50",
        }));
        
        setCachedData(metalsWithColors);
        setBaseMetals(metalsWithColors);
        setMetals(applyCityAdjustments(metalsWithColors, selectedCity));
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Error fetching metal prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      
      const cached = getCachedData();
      if (cached) {
        const metalsWithColors = cached.metals.map((metal: MetalData) => ({
          ...metal,
          colorClass: METAL_COLOR_CLASSES[metal.metal] || "border-border/50",
        }));
        setBaseMetals(metalsWithColors);
        setMetals(applyCityAdjustments(metalsWithColors, selectedCity));
        setLastUpdate(new Date(cached.timestamp));
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCity, applyCityAdjustments]);

  useEffect(() => {
    if (baseMetals.length > 0) {
      setMetals(applyCityAdjustments(baseMetals, selectedCity));
    }
  }, [selectedCity, baseMetals, applyCityAdjustments]);

  useEffect(() => {
    fetchPrices(false);
  }, []);

  const refetch = useCallback(() => {
    return fetchPrices(true);
  }, [fetchPrices]);

  return { metals, isLoading, error, lastUpdate, refetch };
};
