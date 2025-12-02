import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, ComposedChart } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";

interface PredictionChartProps {
  data: Array<{
    date: string;
    actual: number;
    predicted: number;
    confidence_high: number;
    confidence_low: number;
  }>;
  metal: string;
}

export const PredictionChart = ({ data, metal }: PredictionChartProps) => {
  const { convertPrice, currency } = useCurrency();
  const metalColors: Record<string, string> = {
    "Gold 24K": "#F59E0B",
    "Gold 22K": "#D97706",
    Silver: "#94A3B8",
    Platinum: "#E5E7EB",
    Palladium: "#A78BFA",
  };

  const color = metalColors[metal] || "#3B82F6";

  const convertedData = data.map(item => ({
    date: item.date,
    actual: item.actual ? convertPrice(item.actual) : null,
    predicted: convertPrice(item.predicted),
    confidence_high: convertPrice(item.confidence_high),
    confidence_low: convertPrice(item.confidence_low),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={convertedData}>
        <defs>
          <linearGradient id={`confidence-${metal}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          tickFormatter={(value) => `${value.toFixed(0)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--foreground))",
          }}
          formatter={(value: number) => [`${value.toFixed(2)} ${currency}`, ""]}
        />
        <Legend 
          wrapperStyle={{
            paddingTop: "20px",
            color: "hsl(var(--foreground))",
          }}
        />
        <Area
          type="monotone"
          dataKey="confidence_high"
          stroke="none"
          fill={`url(#confidence-${metal})`}
          name="Confidence Range"
        />
        <Area
          type="monotone"
          dataKey="confidence_low"
          stroke="none"
          fill="transparent"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={color}
          strokeWidth={3}
          dot={{ fill: color, r: 5 }}
          name="Actual Price"
          activeDot={{ r: 7 }}
        />
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#3B82F6"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: "#3B82F6", r: 4 }}
          name="Predicted Price"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
