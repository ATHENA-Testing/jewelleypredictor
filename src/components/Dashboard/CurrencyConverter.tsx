import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  INR: 83.12,
  GBP: 0.79,
};

export const CurrencyConverter = () => {
  const [amount, setAmount] = useState<number>(1);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");

  const convertedAmount = (amount * EXCHANGE_RATES[toCurrency]) / EXCHANGE_RATES[fromCurrency];

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Currency Converter</h3>
        <p className="text-sm text-muted-foreground">Convert metal prices across currencies</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="1000"
            />
          </div>

          <div>
            <Label htmlFor="from">From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger id="from">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(EXCHANGE_RATES).map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="p-2 bg-primary/10 rounded-full">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Converted Amount</Label>
            <div className="text-3xl font-bold text-primary mt-2">
              {convertedAmount.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="to">To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger id="to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(EXCHANGE_RATES).map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-background/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            Exchange Rate: 1 {fromCurrency} = {(EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency]).toFixed(4)} {toCurrency}
          </p>
        </div>
      </div>
    </Card>
  );
};
