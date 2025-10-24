import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PredictionChart } from "./PredictionChart";
import { usePredictions } from "@/hooks/usePredictions";
import { Skeleton } from "@/components/ui/skeleton";

const METALS = ["Gold", "Silver", "Platinum", "Palladium"];

export const PredictionChartContainer = () => {
  const [selectedMetal, setSelectedMetal] = useState("Gold");
  const { predictions, isLoading } = usePredictions(selectedMetal);

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">10-Day Price Prediction</h3>
          <p className="text-sm text-muted-foreground">AI-powered forecast with confidence intervals</p>
        </div>
        <Select value={selectedMetal} onValueChange={setSelectedMetal}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select metal" />
          </SelectTrigger>
          <SelectContent>
            {METALS.map((metal) => (
              <SelectItem key={metal} value={metal}>
                {metal}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <PredictionChart data={predictions} metal={selectedMetal} />
      )}
    </Card>
  );
};
