import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Globe,
  Database,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import { format } from "date-fns";

interface SourceRate {
  source: string;
  gold24k: number | null;
  gold22k: number | null;
  silver: number | null;
  fetchedAt: string;
  status: "success" | "failed" | "partial";
}

interface Verification {
  verified: boolean;
  sourcesChecked: number;
  sourcesAvailable: number;
  maxDifference22k: number;
  consensusNote: string;
}

interface CompareData {
  sources: SourceRate[];
  verification: Verification;
  fetchedAt: string;
}

const sourceIcons: Record<string, React.ReactNode> = {
  "LiveChennai.com": <Globe className="h-4 w-4 text-success" />,
  "GoodReturns.in": <Globe className="h-4 w-4 text-warning" />,
  "Database (Manual)": <Database className="h-4 w-4 text-primary" />,
};

const statusBadge = (status: string) => {
  if (status === "success")
    return (
      <Badge variant="default" className="bg-success/20 text-success border-success/30 text-xs gap-1">
        <CheckCircle2 className="h-3 w-3" /> Live
      </Badge>
    );
  if (status === "partial")
    return (
      <Badge variant="secondary" className="text-xs gap-1">
        <Minus className="h-3 w-3" /> Partial
      </Badge>
    );
  return (
    <Badge variant="destructive" className="text-xs gap-1">
      <XCircle className="h-3 w-3" /> Failed
    </Badge>
  );
};

export const RateComparison = () => {
  const [data, setData] = useState<CompareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { formatPrice } = useCurrency();

  const fetchComparison = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("compare-rates", { body: {} });
      if (error) throw error;
      if (result?.success) {
        setData(result as CompareData);
        setHasLoaded(true);
      }
    } catch (e) {
      console.error("Compare rates error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const metals = ["gold24k", "gold22k", "silver"] as const;
  const metalLabels: Record<string, string> = {
    gold24k: "Gold 24K",
    gold22k: "Gold 22K",
    silver: "Silver",
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data?.verification.verified ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-warning" />
            )}
            <CardTitle className="text-lg">Multi-Source Rate Verification</CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchComparison}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            {hasLoaded ? "Refresh" : "Compare Now"}
          </Button>
        </div>
        {data?.verification && (
          <Badge
            variant={data.verification.verified ? "default" : "secondary"}
            className={cn(
              "w-fit mt-2 text-xs",
              data.verification.verified
                ? "bg-success/20 text-success border-success/30"
                : "bg-warning/20 text-warning border-warning/30"
            )}
          >
            {data.verification.consensusNote}
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {!hasLoaded && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Click "Compare Now" to verify rates across LiveChennai, GoodReturns & Database</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-4">
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Source</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                    {metals.map((m) => (
                      <th key={m} className="text-right py-2 text-muted-foreground font-medium">
                        {metalLabels[m]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((src) => (
                    <tr key={src.source} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {sourceIcons[src.source] || <Globe className="h-4 w-4" />}
                          <span className="font-medium text-foreground">{src.source}</span>
                        </div>
                      </td>
                      <td className="py-3">{statusBadge(src.status)}</td>
                      {metals.map((m) => {
                        const val = src[m];
                        return (
                          <td key={m} className="py-3 text-right">
                            {val ? (
                              <span className="font-semibold text-foreground">{formatPrice(val)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fetched time */}
            <p className="text-xs text-muted-foreground text-right">
              Last compared: {format(new Date(data.fetchedAt), "dd MMM yyyy, hh:mm a")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
