import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { INDIAN_CITIES } from "@/contexts/CityContext";
import { Skeleton } from "@/components/ui/skeleton";

const METALS = ["Gold 24K", "Gold 22K", "Silver", "Platinum", "Palladium", "Diamond"];

// City-wise price variations (percentage adjustments from base All India rate)
const CITY_VARIATIONS: Record<string, number> = {
  "all-india": 0,
  "mumbai": 0.5,
  "delhi": 0.3,
  "bangalore": 0.4,
  "chennai": 0.6,
  "kolkata": 0.2,
  "hyderabad": 0.35,
};

interface CityRatesTableProps {
  basePrices: Record<string, number>;
  isLoading?: boolean;
}

export const CityRatesTable = ({ basePrices, isLoading }: CityRatesTableProps) => {
  const [selectedMetal, setSelectedMetal] = useState("Gold 24K");
  const { formatPrice } = useCurrency();

  const getCityPrice = (cityValue: string, basePrice: number) => {
    const variation = CITY_VARIATIONS[cityValue] || 0;
    return basePrice * (1 + variation / 100);
  };

  const basePrice = basePrices[selectedMetal] || 0;

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-foreground">City/Region Wise Rates</h3>
          </div>
          <p className="text-sm text-muted-foreground">Compare metal rates across major Indian cities</p>
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
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-foreground font-semibold">City/Region</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Per Gram</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Per 10 Grams</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Per KG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INDIAN_CITIES.map((city) => {
                const cityPrice = getCityPrice(city.value, basePrice);
                return (
                  <TableRow key={city.value} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {city.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      {formatPrice(cityPrice)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatPrice(cityPrice * 10)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatPrice(cityPrice * 1000)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        * Rates may vary slightly based on local market conditions and taxes
      </div>
    </Card>
  );
};
