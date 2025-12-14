import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METALPRICE_API_KEY = Deno.env.get('METALPRICE_API_KEY');
const METALPRICE_API_URL = "https://api.metalpriceapi.com/v1/latest";
const TROY_OZ_TO_GRAMS = 31.1035;

interface MetalPrice {
  metal: string;
  symbol: string;
  price: number;
  pricePerGram: number;
  change: number;
  changePercent: number;
  unit: string;
  timestamp: number;
  location: string;
}

interface ManualRate {
  metal: string;
  price_per_gram: number;
}

// Fetch admin-set manual rates from database
async function fetchManualRates(): Promise<Record<string, number> | null> {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseClient
      .from('manual_market_rates')
      .select('metal, price_per_gram');

    if (error) {
      console.error('Error fetching manual rates:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('No manual rates found in database');
      return null;
    }

    const rates: Record<string, number> = {};
    data.forEach((rate: ManualRate) => {
      if (rate.metal === 'Gold 24K') rates.GOLD_24K = rate.price_per_gram;
      else if (rate.metal === 'Gold 22K') rates.GOLD_22K = rate.price_per_gram;
      else if (rate.metal === 'Silver') rates.SILVER = rate.price_per_gram;
      else if (rate.metal === 'Platinum') rates.PLATINUM = rate.price_per_gram;
      else if (rate.metal === 'Palladium') rates.PALLADIUM = rate.price_per_gram;
      else if (rate.metal === 'Diamond') rates.DIAMOND = rate.price_per_gram;
    });

    console.log('Manual rates from database:', JSON.stringify(rates));
    return rates;
  } catch (error) {
    console.error('Error in fetchManualRates:', error);
    return null;
  }
}

// Import duty and tax adjustment factor
const INDIA_PREMIUM_FACTOR = 1.20;

async function fetchFromMetalPriceAPI(manualRates: Record<string, number>): Promise<Record<string, number> | null> {
  if (!METALPRICE_API_KEY) {
    console.log('No API key found, will use manual rates');
    return null;
  }

  console.log('Fetching from MetalpriceAPI for reference');

  try {
    const symbols = 'XAU,XAG,XPT,XPD';
    const url = `${METALPRICE_API_URL}?api_key=${METALPRICE_API_KEY}&base=INR&currencies=${symbols}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('MetalpriceAPI data:', JSON.stringify(data));

    if (!data.success || !data.rates) {
      console.log('Invalid API response, using manual rates');
      return null;
    }

    const xauPerOz = data.rates['INRXAU'] || (1 / data.rates['XAU']);
    const xagPerOz = data.rates['INRXAG'] || (1 / data.rates['XAG']);
    const xptPerOz = data.rates['INRXPT'] || (1 / data.rates['XPT']);
    const xpdPerOz = data.rates['INRXPD'] || (1 / data.rates['XPD']);

    const rates: Record<string, number> = {
      GOLD_24K: (xauPerOz / TROY_OZ_TO_GRAMS) * INDIA_PREMIUM_FACTOR,
      GOLD_22K: ((xauPerOz / TROY_OZ_TO_GRAMS) * INDIA_PREMIUM_FACTOR) * (22/24),
      SILVER: (xagPerOz / TROY_OZ_TO_GRAMS) * INDIA_PREMIUM_FACTOR,
      PLATINUM: (xptPerOz / TROY_OZ_TO_GRAMS) * INDIA_PREMIUM_FACTOR,
      PALLADIUM: (xpdPerOz / TROY_OZ_TO_GRAMS) * INDIA_PREMIUM_FACTOR,
    };

    console.log('Calculated API rates:', JSON.stringify(rates));
    
    // Validate rates against manual rates (within 15% tolerance)
    const isGoldValid = Math.abs(rates.GOLD_24K - manualRates.GOLD_24K) / manualRates.GOLD_24K < 0.15;
    const isSilverValid = Math.abs(rates.SILVER - manualRates.SILVER) / manualRates.SILVER < 0.15;
    
    if (!isGoldValid || !isSilverValid) {
      console.log('API rates differ significantly from manual rates, using manual rates instead');
      return null;
    }

    return rates;
  } catch (error) {
    console.error('Error fetching from API:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await req.json().catch(() => ({}));
    console.log('Fetching metal prices (Indian domestic rates)');

    // PRIORITY 1: Fetch admin-set manual rates from database
    const manualRates = await fetchManualRates();
    
    if (!manualRates || Object.keys(manualRates).length < 6) {
      console.error('Manual rates not available or incomplete');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Manual rates not configured. Admin needs to set rates.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PRIORITY 2: Try API but validate against manual rates
    let ratesPerGram = await fetchFromMetalPriceAPI(manualRates);
    let usingFallback = false;
    
    // PRIORITY 3: Fall back to manual rates if API fails or returns invalid data
    if (!ratesPerGram) {
      ratesPerGram = manualRates;
      usingFallback = true;
      console.log('Using admin-set manual rates');
    }

    const timestamp = Date.now();
    
    const metals: MetalPrice[] = [
      {
        metal: "Gold 24K",
        symbol: "XAU/INR",
        price: ratesPerGram.GOLD_24K * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.GOLD_24K,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Gold 22K",
        symbol: "XAU/INR",
        price: ratesPerGram.GOLD_22K * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.GOLD_22K,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Silver",
        symbol: "XAG/INR",
        price: ratesPerGram.SILVER * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.SILVER,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Platinum",
        symbol: "XPT/INR",
        price: ratesPerGram.PLATINUM * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.PLATINUM,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Palladium",
        symbol: "XPD/INR",
        price: ratesPerGram.PALLADIUM * TROY_OZ_TO_GRAMS,
        pricePerGram: ratesPerGram.PALLADIUM,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Diamond",
        symbol: "DIA/INR",
        price: ratesPerGram.DIAMOND,
        pricePerGram: ratesPerGram.DIAMOND,
        change: 0,
        changePercent: 0,
        unit: "per carat",
        timestamp,
        location: 'All India'
      },
    ];

    console.log("Processed metal prices:", JSON.stringify(metals));

    // Store historical price data
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const historyRecords = metals.map(metal => ({
        metal: metal.metal,
        price_per_gram: metal.pricePerGram,
        price_per_troy_oz: metal.price,
        change_percent: metal.changePercent,
        recorded_at: new Date().toISOString()
      }));

      const { error: historyError } = await supabaseClient
        .from('metal_prices_history')
        .insert(historyRecords);

      if (historyError) {
        console.error('Error storing historical data:', historyError);
      } else {
        console.log('Historical data stored successfully');
      }
    } catch (storageError) {
      console.error('Error accessing database:', storageError);
    }

    return new Response(JSON.stringify({ 
      metals, 
      success: true,
      usingFallback
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-metal-prices function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
