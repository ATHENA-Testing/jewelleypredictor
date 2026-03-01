import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metal } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch historical data for the metal (last 30 days)
    const { data: historicalData, error: historyError } = await supabaseClient
      .from('metal_prices_history')
      .select('*')
      .eq('metal', metal)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: true });

    if (historyError) throw historyError;

    if (!historicalData || historicalData.length < 7) {
      return new Response(
        JSON.stringify({ error: 'Insufficient historical data for predictions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Prepare data for AI analysis
    const priceData = historicalData.map(d => ({
      date: d.recorded_at,
      price: d.price_per_gram,
      change: d.change_percent
    }));

    const currentPrice = priceData[priceData.length - 1].price;
    const avgChange = priceData.reduce((sum, d) => sum + (d.change || 0), 0) / priceData.length;
    const volatility = Math.sqrt(
      priceData.reduce((sum, d) => sum + Math.pow((d.change || 0) - avgChange, 2), 0) / priceData.length
    );

    // Call Lovable AI for prediction analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert precious metals market analyst specializing in ${metal}. Analyze historical price data and provide accurate predictions with reasoning based on market trends, technical indicators, and economic factors.`
          },
          {
            role: 'user',
            content: `You are an expert precious metals market analyst with access to comprehensive historical data and market intelligence. You use advanced machine learning techniques including supervised learning, ensemble methods, and reinforcement learning.

REINFORCEMENT LEARNING APPROACH:
- Analyze prediction accuracy from historical data
- Learn from prediction vs. actual price differences
- Continuously improve future forecasts based on past performance
- Adjust confidence intervals based on historical accuracy
- Apply ensemble methods to combine multiple prediction models

Analyze the following data for ${metal} and provide 10-day price predictions:

HISTORICAL DATA (Last ${priceData.length} days):
${JSON.stringify(priceData.slice(-14), null, 2)}

CURRENT MARKET CONDITIONS:
- Current Price: ₹${currentPrice.toFixed(2)} per gram
- Average Daily Change: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%
- Price Volatility: ${volatility.toFixed(2)}%
- 30-Day Trend: ${priceData[priceData.length-1].price > priceData[0].price ? 'Upward' : 'Downward'}
- Historical Prediction Accuracy: Learn from past predictions to improve future forecasts

ANALYSIS REQUIREMENTS:
1. Apply supervised learning on historical price patterns
2. Use ensemble methods (Random Forest, Gradient Boosting concepts)
3. Consider economic indicators, geopolitical factors, and market sentiment
4. Apply reinforcement learning from past prediction accuracy
5. Cross-reference with multiple reliable market sources (e.g., Reuters, Bloomberg, World Gold Council, Kitco, MetalFocus)
6. Account for seasonal patterns and cyclical trends

Based on this comprehensive analysis, provide:
1. 10-day price predictions with confidence intervals (using ensemble methods)
2. Overall confidence score (0-100) based on model accuracy and cross-source validation
3. Detailed reasoning for your predictions including learning from historical data
4. Key factors influencing the forecast
5. Market sentiment (bullish/bearish/neutral)
6. Reliable authoritative sources for your analysis (minimum 3 sources)

Return ONLY a JSON object in this exact format:
{
  "predictions": [
    {"day": 1, "price": number, "confidence_high": number, "confidence_low": number}
  ],
  "confidence_score": number,
  "reasoning": "string (include mention of machine learning and historical learning)",
  "key_factors": ["string"],
  "sentiment": "bullish|bearish|neutral",
  "sources": ["string (minimum 3 authoritative sources like Reuters, Bloomberg, World Gold Council, Kitco, MetalFocus)"]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI response');
    
    const analysis = JSON.parse(jsonMatch[0]);

    // Store predictions in database
    const predictionInserts = analysis.predictions.map((pred: any, index: number) => {
      const predictionDate = new Date();
      predictionDate.setDate(predictionDate.getDate() + index + 1);
      
      return {
        metal,
        prediction_date: predictionDate.toISOString().split('T')[0],
        predicted_price: pred.price,
        confidence_score: analysis.confidence_score,
        reasoning: analysis.reasoning,
        sources: analysis.sources,
        confidence_high: pred.confidence_high,
        confidence_low: pred.confidence_low
      };
    });

    const { error: insertError } = await supabaseClient
      .from('metal_predictions')
      .upsert(predictionInserts, { onConflict: 'metal,prediction_date' });

    if (insertError) {
      console.error('Error inserting predictions:', insertError);
    }

    // Store market analysis
    await supabaseClient
      .from('market_analysis')
      .insert({
        metal,
        analysis_type: 'prediction',
        analysis_text: analysis.reasoning,
        sentiment: analysis.sentiment,
        key_factors: analysis.key_factors,
        sources: analysis.sources
      });

    return new Response(
      JSON.stringify({
        predictions: analysis.predictions,
        confidence_score: analysis.confidence_score,
        reasoning: analysis.reasoning,
        key_factors: analysis.key_factors,
        sentiment: analysis.sentiment,
        sources: analysis.sources
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating predictions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate predictions' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});