import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Fetch recent historical data
    const { data: recentData } = await supabaseClient
      .from('metal_prices_history')
      .select('*')
      .eq('metal', metal)
      .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(7);

    // Call Lovable AI for market analysis
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
            content: `You are an expert precious metals market analyst. Provide comprehensive market analysis for ${metal} based on recent trends, global economic factors, and technical indicators.`
          },
          {
            role: 'user',
            content: `Provide a detailed market analysis for ${metal}:

Recent Price Data (last 7 days):
${JSON.stringify(recentData, null, 2)}

Include:
1. Current market sentiment (bullish/bearish/neutral)
2. Key factors driving the market
3. Technical analysis summary
4. Economic indicators impact
5. Supply and demand analysis
6. Geopolitical factors
7. Expert recommendations
8. Reliable sources for the analysis

Format as JSON:
{
  "sentiment": "bullish/bearish/neutral",
  "analysis": "detailed market analysis",
  "key_factors": ["factor1", "factor2"],
  "technical_summary": "technical analysis",
  "economic_impact": "economic factors",
  "recommendations": ["recommendation1", "recommendation2"],
  "sources": ["source1", "source2"]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI response');
    
    const analysis = JSON.parse(jsonMatch[0]);

    // Store market analysis
    await supabaseClient
      .from('market_analysis')
      .insert({
        metal,
        analysis_type: 'comprehensive',
        analysis_text: analysis.analysis,
        sentiment: analysis.sentiment,
        key_factors: {
          factors: analysis.key_factors,
          technical: analysis.technical_summary,
          economic: analysis.economic_impact,
          recommendations: analysis.recommendations
        },
        sources: analysis.sources
      });

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating market analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate analysis' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});