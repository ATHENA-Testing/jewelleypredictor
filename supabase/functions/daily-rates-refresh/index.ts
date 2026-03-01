import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// All metals to process for predictions
const METALS = ['Gold 24K', 'Gold 22K', 'Silver', 'Platinum', 'Palladium', 'Diamond'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('=== DAILY RATES REFRESH STARTED ===');
  console.log('Time (IST):', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const results = {
      ratesFetch: { success: false, message: '', source: '' },
      predictions: [] as { metal: string; success: boolean; message: string }[],
      marketAnalysis: [] as { metal: string; success: boolean; message: string }[],
    };

    // STEP 1: Fetch latest rates using fetch-metal-prices function
    console.log('\n--- STEP 1: Fetching latest metal rates ---');
    try {
      const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-metal-prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        results.ratesFetch = {
          success: true,
          message: `Fetched rates for ${fetchData.data?.length || 0} metals`,
          source: fetchData.source || 'unknown',
        };
        console.log('Rates fetch successful:', results.ratesFetch.message);
      } else {
        results.ratesFetch = {
          success: false,
          message: `Fetch failed with status ${fetchResponse.status}`,
          source: '',
        };
        console.error('Rates fetch failed:', results.ratesFetch.message);
      }
    } catch (error) {
      results.ratesFetch = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        source: '',
      };
      console.error('Rates fetch error:', error);
    }

    // STEP 2: Generate predictions for all metals
    console.log('\n--- STEP 2: Generating predictions for all metals ---');
    for (const metal of METALS) {
      console.log(`Generating predictions for ${metal}...`);
      try {
        const predResponse = await fetch(`${supabaseUrl}/functions/v1/generate-predictions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metal }),
        });

        if (predResponse.ok) {
          const predData = await predResponse.json();
          results.predictions.push({
            metal,
            success: true,
            message: `Generated ${predData.predictions?.length || 0} predictions`,
          });
          console.log(`✓ ${metal}: Predictions generated successfully`);
        } else {
          const errorText = await predResponse.text();
          results.predictions.push({
            metal,
            success: false,
            message: `Status ${predResponse.status}: ${errorText.substring(0, 100)}`,
          });
          console.error(`✗ ${metal}: Prediction failed - ${predResponse.status}`);
        }
      } catch (error) {
        results.predictions.push({
          metal,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`✗ ${metal}: Prediction error -`, error);
      }

      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // STEP 3: Generate market analysis for primary metals
    console.log('\n--- STEP 3: Generating market analysis ---');
    const primaryMetals = ['Gold 24K', 'Silver', 'Platinum'];
    
    for (const metal of primaryMetals) {
      console.log(`Generating market analysis for ${metal}...`);
      try {
        const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/generate-market-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metal }),
        });

        if (analysisResponse.ok) {
          results.marketAnalysis.push({
            metal,
            success: true,
            message: 'Market analysis generated',
          });
          console.log(`✓ ${metal}: Market analysis generated`);
        } else {
          results.marketAnalysis.push({
            metal,
            success: false,
            message: `Status ${analysisResponse.status}`,
          });
          console.error(`✗ ${metal}: Market analysis failed`);
        }
      } catch (error) {
        results.marketAnalysis.push({
          metal,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`✗ ${metal}: Market analysis error -`, error);
      }

      // Delay between API calls
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const duration = Date.now() - startTime;
    console.log('\n=== DAILY REFRESH COMPLETED ===');
    console.log(`Total duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log('Results:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Daily refresh failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
