import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, ComposedChart, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Target, AlertCircle } from "lucide-react";
import { useHistoricalData, TimePeriod } from "@/hooks/useHistoricalData";
import { useCurrency } from "@/contexts/CurrencyContext";

const METALS = ['Gold 24K', 'Gold 22K', 'Silver', 'Platinum', 'Palladium', 'Diamond'];

const metalColors: Record<string, { primary: string; secondary: string }> = {
  "Gold 24K": { primary: "#F59E0B", secondary: "#FCD34D" },
  "Gold 22K": { primary: "#D97706", secondary: "#FDE68A" },
  "Silver": { primary: "#94A3B8", secondary: "#CBD5E1" },
  "Platinum": { primary: "#6B7280", secondary: "#9CA3AF" },
  "Palladium": { primary: "#A78BFA", secondary: "#C4B5FD" },
  "Diamond": { primary: "#60A5FA", secondary: "#93C5FD" },
};

export const HistoricalComparisonChart = () => {
  const [selectedMetal, setSelectedMetal] = useState("Gold 24K");
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("30");
  const { convertPrice, currency } = useCurrency();
  const { data, isLoading, error } = useHistoricalData(selectedMetal, selectedPeriod);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data
      .slice()
      .reverse()
      .map(item => ({
        date: item.date,
        predicted: convertPrice(item.predictedRate),
        actual: item.actualRate ? convertPrice(item.actualRate) : null,
        accuracy: item.accuracyPercentage,
        difference: item.actualRate 
          ? convertPrice(item.predictedRate - item.actualRate) 
          : null,
      }));
  }, [data, convertPrice]);

  const stats = useMemo(() => {
    const withActual = data.filter(d => d.actualRate !== null);
    if (withActual.length === 0) return null;

    const avgAccuracy = withActual.reduce((sum, d) => sum + (d.accuracyPercentage || 0), 0) / withActual.length;
    const perfectPredictions = withActual.filter(d => (d.accuracyPercentage || 0) >= 98).length;
    const goodPredictions = withActual.filter(d => (d.accuracyPercentage || 0) >= 95).length;
    
    const latestWithActual = withActual[0];
    const trend = latestWithActual 
      ? (latestWithActual.predictedRate > (latestWithActual.actualRate || 0) ? 'overestimated' : 'underestimated')
      : null;

    return {
      avgAccuracy: avgAccuracy.toFixed(1),
      perfectPredictions,
      goodPredictions,
      totalWithActual: withActual.length,
      trend,
    };
  }, [data]);

  const colors = metalColors[selectedMetal] || { primary: "#3B82F6", secondary: "#93C5FD" };

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border bg-gradient-card overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">
              Historical Price Comparison
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedMetal} onValueChange={setSelectedMetal}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METALS.map(metal => (
                  <SelectItem key={metal} value={metal}>{metal}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="365">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.avgAccuracy}%</div>
              <p className="text-xs text-muted-foreground">Avg Accuracy</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-success">{stats.perfectPredictions}</div>
              <p className="text-xs text-muted-foreground">Perfect (98%+)</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-warning">{stats.goodPredictions}</div>
              <p className="text-xs text-muted-foreground">Good (95%+)</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{stats.totalWithActual}</div>
              <p className="text-xs text-muted-foreground">Data Points</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No historical data available for {selectedMetal}</p>
              <p className="text-sm mt-2">Data will appear once predictions are generated</p>
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id={`gradient-${selectedMetal}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3} 
                />
                
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  domain={['auto', 'auto']}
                />
                
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number | null, name: string) => {
                    if (value === null) return ['N/A', name];
                    if (name === 'accuracy') return [`${value.toFixed(1)}%`, 'Accuracy'];
                    return [`${currency} ${value.toFixed(2)}`, name === 'predicted' ? 'Predicted' : 'Actual'];
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                
                <Legend 
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="circle"
                />

                {/* Predicted Price Line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke={colors.primary}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: colors.primary, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: colors.primary, strokeWidth: 2, fill: "hsl(var(--background))" }}
                  name="Predicted"
                />

                {/* Actual Price Line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: "#10B981", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 7, stroke: "#10B981", strokeWidth: 2, fill: "hsl(var(--background))" }}
                  name="Actual"
                  connectNulls={false}
                />

                {/* Accuracy as area */}
                <Area
                  type="monotone"
                  dataKey="predicted"
                  fill={`url(#gradient-${selectedMetal})`}
                  stroke="none"
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legend Explanation */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed" style={{ borderColor: colors.primary }} />
                <span className="text-muted-foreground">AI Predicted Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-success" />
                <span className="text-muted-foreground">Actual Market Price</span>
              </div>
              <div className="flex items-center gap-2">
                {stats?.trend === 'overestimated' ? (
                  <TrendingUp className="h-4 w-4 text-warning" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-success" />
                )}
                <span className="text-muted-foreground">
                  Model tends to {stats?.trend || 'match accurately'}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
