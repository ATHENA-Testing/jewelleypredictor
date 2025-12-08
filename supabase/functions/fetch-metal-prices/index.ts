import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METALPRICE_API_KEY = Deno.env.get('METALPRICE_API_KEY');
const METALPRICE_API_URL = "https://api.metalpriceapi.com/v1/latest";
const TROY_OZ_TO_GRAMS = 31.1035; // 1 troy ounce = 31.1035 grams

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

async function fetchFromMetalPriceAPI(): Promise<Record<string, number>> {
  if (!METALPRICE_API_KEY) {
    console.log('No API key found, will use fallback');
    throw new Error('API key not configured');
  }

  console.log('Fetching from MetalpriceAPI (All India rates)');

  // Free tier supports base currency conversions only
  const symbols = 'XAU,XAG,XPT,XPD';
  const url = `${METALPRICE_API_URL}?api_key=${METALPRICE_API_KEY}&base=INR&currencies=${symbols}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  console.log('MetalpriceAPI data:', JSON.stringify(data));

  if (!data.success || !data.rates) {
    throw new Error('Invalid API response');
  }

  // The API returns rates in INRXAU format, which means "troy oz per 1 INR"
  // We need "INR per troy oz", so we take 1/rate
  const rates: Record<string, number> = {
    XAU: data.rates['INRXAU'] || (1 / data.rates['XAU']),
    XAG: data.rates['INRXAG'] || (1 / data.rates['XAG']),
    XPT: data.rates['INRXPT'] || (1 / data.rates['XPT']),
    XPD: data.rates['INRXPD'] || (1 / data.rates['XPD'])
  };

  if (!rates.XAU || !rates.XAG || !rates.XPT || !rates.XPD) {
    throw new Error('Missing required rates in API response');
  }

  return rates;
}

// Fallback prices in INR per troy ounce (current approximate market rates as of Dec 2025)
// Gold 24K: ~₹12,000/gram = ~₹373,242/troy oz
// Silver: ~₹95/gram = ~₹2,955/troy oz  
// Platinum: ~₹3,200/gram = ~₹99,531/troy oz
// Palladium: ~₹4,000/gram = ~₹124,414/troy oz
const FALLBACK_PRICES_INR = {
  XAU: 373242, // ~INR 373,242 per troy oz (~₹12,000 per gram)
  XAG: 2955, // ~INR 2,955 per troy oz (~₹95 per gram)
  XPT: 99531, // ~INR 99,531 per troy oz (~₹3,200 per gram)
  XPD: 124414, // ~INR 124,414 per troy oz (~₹4,000 per gram)
};

// Diamond price per carat in INR (approximate market rate for 1 carat round brilliant)
const DIAMOND_PRICE_PER_CARAT = 350000; // ~₹3,50,000 per carat
const CARAT_TO_GRAMS = 0.2; // 1 carat = 0.2 grams

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await req.json().catch(() => ({})); // Parse but ignore any body parameters
    console.log('Fetching metal prices (All India rates)');

    let pricesPerTroyOz: Record<string, number>;
    let usingFallback = false;

    try {
      pricesPerTroyOz = await fetchFromMetalPriceAPI();
    } catch (error) {
      console.error('MetalpriceAPI fetch error:', error);
      console.log('Using fallback prices');
      pricesPerTroyOz = { ...FALLBACK_PRICES_INR };
      usingFallback = true;
    }

    const timestamp = Date.now();
    
    // Build metals array with exact per gram prices from live data (no random fluctuations)
    const goldPrice24K = pricesPerTroyOz.XAU;
    const goldPrice22K = goldPrice24K * (22 / 24); // 22K is 91.67% of 24K
    const diamondPricePerGram = DIAMOND_PRICE_PER_CARAT / CARAT_TO_GRAMS; // Price per gram for diamond
    
    const metals: MetalPrice[] = [
      {
        metal: "Gold 24K",
        symbol: "XAU/INR",
        price: goldPrice24K,
        pricePerGram: goldPrice24K / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Gold 22K",
        symbol: "XAU/INR",
        price: goldPrice22K,
        pricePerGram: goldPrice22K / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Silver",
        symbol: "XAG/INR",
        price: pricesPerTroyOz.XAG,
        pricePerGram: pricesPerTroyOz.XAG / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Platinum",
        symbol: "XPT/INR",
        price: pricesPerTroyOz.XPT,
        pricePerGram: pricesPerTroyOz.XPT / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Palladium",
        symbol: "XPD/INR",
        price: pricesPerTroyOz.XPD,
        pricePerGram: pricesPerTroyOz.XPD / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Diamond",
        symbol: "DIA/INR",
        price: DIAMOND_PRICE_PER_CARAT,
        pricePerGram: diamondPricePerGram,
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
      // Don't fail the request if storage fails
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
    
    // Return fallback data on error
    const timestamp = Date.now();
    const goldPrice24K = FALLBACK_PRICES_INR.XAU;
    const goldPrice22K = goldPrice24K * (22 / 24);
    const diamondPricePerGram = DIAMOND_PRICE_PER_CARAT / CARAT_TO_GRAMS;
    
    const metals: MetalPrice[] = [
      {
        metal: "Gold 24K",
        symbol: "XAU/INR",
        price: goldPrice24K,
        pricePerGram: goldPrice24K / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Gold 22K",
        symbol: "XAU/INR",
        price: goldPrice22K,
        pricePerGram: goldPrice22K / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Silver",
        symbol: "XAG/INR",
        price: FALLBACK_PRICES_INR.XAG,
        pricePerGram: FALLBACK_PRICES_INR.XAG / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Platinum",
        symbol: "XPT/INR",
        price: FALLBACK_PRICES_INR.XPT,
        pricePerGram: FALLBACK_PRICES_INR.XPT / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Palladium",
        symbol: "XPD/INR",
        price: FALLBACK_PRICES_INR.XPD,
        pricePerGram: FALLBACK_PRICES_INR.XPD / TROY_OZ_TO_GRAMS,
        change: 0,
        changePercent: 0,
        unit: "per gram",
        timestamp,
        location: 'All India'
      },
      {
        metal: "Diamond",
        symbol: "DIA/INR",
        price: DIAMOND_PRICE_PER_CARAT,
        pricePerGram: diamondPricePerGram,
        change: 0,
        changePercent: 0,
        unit: "per carat",
        timestamp,
        location: 'All India'
      }
    ];

    return new Response(JSON.stringify({ 
      metals, 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      usingFallback: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
