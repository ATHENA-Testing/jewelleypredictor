import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, TrendingUp, TrendingDown, Brain, BookOpen } from 'lucide-react';
import { useHistoricalData, TimePeriod } from '@/hooks/useHistoricalData';
import { useCurrency } from '@/contexts/CurrencyContext';

const TIME_PERIODS = [
  { value: '1', label: 'Last 1 Day' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: '365', label: 'Last 365 Days' },
];

const METALS = [
  { value: 'Gold 24K', label: 'Gold 24K' },
  { value: 'Gold 22K', label: 'Gold 22K' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Diamond', label: 'Diamond' },
  { value: 'Platinum', label: 'Platinum' },
  { value: 'Palladium', label: 'Palladium' },
];

export const HistoricalDataTable = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7');
  const [selectedMetal, setSelectedMetal] = useState('Gold 24K');
  const { data, isLoading, error } = useHistoricalData(selectedMetal, selectedPeriod);
  const { formatPrice } = useCurrency();

  const getAccuracyBadge = (accuracy: number | null) => {
    if (accuracy === null) {
      return <Badge variant="outline" className="bg-muted">Pending</Badge>;
    }
    if (accuracy >= 98) {
      return <Badge className="bg-success text-success-foreground">{accuracy.toFixed(1)}%</Badge>;
    }
    if (accuracy >= 95) {
      return <Badge className="bg-primary text-primary-foreground">{accuracy.toFixed(1)}%</Badge>;
    }
    if (accuracy >= 90) {
      return <Badge className="bg-warning text-warning-foreground">{accuracy.toFixed(1)}%</Badge>;
    }
    return <Badge variant="destructive">{accuracy.toFixed(1)}%</Badge>;
  };

  const getAccuracyIcon = (accuracy: number | null) => {
    if (accuracy === null) return null;
    return accuracy >= 95 ? (
      <TrendingUp className="h-4 w-4 text-success" />
    ) : (
      <TrendingDown className="h-4 w-4 text-destructive" />
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historical Prediction Data
            <Brain className="h-4 w-4 text-muted-foreground ml-2" />
            <span className="text-sm font-normal text-muted-foreground">Reinforcement Learning</span>
          </CardTitle>
          
          <div className="flex flex-wrap gap-3">
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMetal} onValueChange={setSelectedMetal}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select Metal" />
              </SelectTrigger>
              <SelectContent>
                {METALS.map((metal) => (
                  <SelectItem key={metal.value} value={metal.value}>
                    {metal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="text-destructive text-sm mb-4">
            Error loading data: {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No historical data available for {selectedMetal} in the selected period.</p>
            <p className="text-sm mt-2">Predictions will appear here once generated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="text-right">Predicted Rate</TableHead>
                  <TableHead className="text-right">Actual Closing Rate</TableHead>
                  <TableHead className="text-center w-[120px]">Accuracy</TableHead>
                  <TableHead className="min-w-[200px]">
                    <div className="flex items-center gap-1">
                      <Brain className="h-4 w-4" />
                      Learnings
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[200px]">Match/Mismatch Reasons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPrice(row.predictedRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.actualRate !== null ? formatPrice(row.actualRate) : (
                        <span className="text-muted-foreground italic">Awaiting</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getAccuracyIcon(row.accuracyPercentage)}
                        {getAccuracyBadge(row.accuracyPercentage)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                      <p className="line-clamp-2" title={row.learnings}>
                        {row.learnings}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                      <p className="line-clamp-2" title={row.matchReasons}>
                        {row.matchReasons}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Reinforcement Learning Info */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Reinforcement Learning Feedback Loop</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Our AI model continuously learns from prediction accuracy data. Each comparison between 
                predicted and actual prices feeds back into the model, adjusting weights and improving 
                future predictions through ensemble methods and deep learning optimization.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
