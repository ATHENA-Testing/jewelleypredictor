import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, IndianRupee, TrendingUp, Receipt } from "lucide-react";
import { useMetalPrices } from "@/hooks/useMetalPrices";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const GoldCalculators = () => {
  const { metals } = useMetalPrices();
  const gold22 = metals.find((m) => m.metal === "Gold 22K")?.pricePerGram || 6800;
  const gold24 = metals.find((m) => m.metal === "Gold 24K")?.pricePerGram || 7400;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg"><Calculator className="w-4 h-4 text-primary" /></div>
          Gold Calculators
        </CardTitle>
        <p className="text-xs text-muted-foreground">Plan jewellery purchases, SIPs and gold loans with live rates</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="jewellery">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="jewellery">Jewellery</TabsTrigger>
            <TabsTrigger value="sip">SIP</TabsTrigger>
            <TabsTrigger value="loan">Loan EMI</TabsTrigger>
          </TabsList>

          <TabsContent value="jewellery" className="pt-4">
            <JewelleryCalc gold22={gold22} gold24={gold24} />
          </TabsContent>
          <TabsContent value="sip" className="pt-4">
            <SipCalc gold22={gold22} />
          </TabsContent>
          <TabsContent value="loan" className="pt-4">
            <LoanCalc gold22={gold22} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="flex justify-between py-1.5 border-b border-border/40 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-xs ${strong ? "font-bold text-foreground" : "text-foreground"}`}>{value}</span>
  </div>
);

const JewelleryCalc = ({ gold22, gold24 }: { gold22: number; gold24: number }) => {
  const [karat, setKarat] = useState<"22" | "24">("22");
  const [grams, setGrams] = useState("10");
  const [making, setMaking] = useState("12"); // %
  const [wastage, setWastage] = useState("0"); // %

  const { metal, making_charge, wastage_charge, subtotal, gst, total } = useMemo(() => {
    const rate = karat === "22" ? gold22 : gold24;
    const g = parseFloat(grams) || 0;
    const metal = g * rate;
    const wastage_charge = (metal * (parseFloat(wastage) || 0)) / 100;
    const making_charge = (metal * (parseFloat(making) || 0)) / 100;
    const subtotal = metal + wastage_charge + making_charge;
    const gst = subtotal * 0.03; // 3% GST on gold
    return { metal, making_charge, wastage_charge, subtotal, gst, total: subtotal + gst };
  }, [karat, grams, making, wastage, gold22, gold24]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Karat</Label>
          <Select value={karat} onValueChange={(v: "22" | "24") => setKarat(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="22">22K (916 Hallmark)</SelectItem>
              <SelectItem value="24">24K (999 Pure)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Weight (grams)</Label>
          <Input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} /></div>
        <div><Label className="text-xs">Making Charge (%)</Label>
          <Input type="number" value={making} onChange={(e) => setMaking(e.target.value)} /></div>
        <div><Label className="text-xs">Wastage (%)</Label>
          <Input type="number" value={wastage} onChange={(e) => setWastage(e.target.value)} /></div>
      </div>
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <Row label={`Gold Value (${karat}K)`} value={inr(metal)} />
        <Row label="Wastage" value={inr(wastage_charge)} />
        <Row label="Making Charges" value={inr(making_charge)} />
        <Row label="GST (3%)" value={inr(gst)} />
        <div className="flex justify-between pt-2 mt-1 border-t border-border">
          <span className="text-sm font-semibold flex items-center gap-1"><Receipt className="w-3.5 h-3.5" />Final Price</span>
          <span className="text-sm font-bold text-primary">{inr(total)}</span>
        </div>
      </div>
    </div>
  );
};

const SipCalc = ({ gold22 }: { gold22: number }) => {
  const [monthly, setMonthly] = useState("5000");
  const [years, setYears] = useState("5");
  const [appreciation, setAppreciation] = useState("9"); // historical gold ~8-10%

  const { totalInvested, gramsAccumulated, futureValue, gain } = useMemo(() => {
    const m = parseFloat(monthly) || 0;
    const n = (parseFloat(years) || 0) * 12;
    const r = (parseFloat(appreciation) || 0) / 100 / 12;
    const totalInvested = m * n;
    const grams = m / gold22;
    const gramsAccumulated = grams * n;
    // FV of SIP
    const futureValue = r > 0 ? m * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : totalInvested;
    return { totalInvested, gramsAccumulated, futureValue, gain: futureValue - totalInvested };
  }, [monthly, years, appreciation, gold22]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div><Label className="text-xs">Monthly (₹)</Label>
          <Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></div>
        <div><Label className="text-xs">Years</Label>
          <Input type="number" value={years} onChange={(e) => setYears(e.target.value)} /></div>
        <div><Label className="text-xs">Annual return %</Label>
          <Input type="number" value={appreciation} onChange={(e) => setAppreciation(e.target.value)} /></div>
      </div>
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <Row label="Total Invested" value={inr(totalInvested)} />
        <Row label="Approx. Gold Accumulated" value={`${gramsAccumulated.toFixed(2)} g`} />
        <Row label="Expected Future Value" value={inr(futureValue)} strong />
        <div className="flex justify-between pt-2 mt-1 border-t border-border">
          <span className="text-sm font-semibold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-success" />Expected Gain</span>
          <span className="text-sm font-bold text-success">{inr(gain)}</span>
        </div>
      </div>
    </div>
  );
};

const LoanCalc = ({ gold22 }: { gold22: number }) => {
  const [grams, setGrams] = useState("20");
  const [ltv, setLtv] = useState("75"); // RBI cap up to 75%
  const [rate, setRate] = useState("11"); // p.a.
  const [months, setMonths] = useState("12");

  const { collateral, eligible, emi, totalPayable, interest } = useMemo(() => {
    const g = parseFloat(grams) || 0;
    const collateral = g * gold22;
    const eligible = (collateral * (parseFloat(ltv) || 0)) / 100;
    const r = (parseFloat(rate) || 0) / 12 / 100;
    const n = parseFloat(months) || 0;
    const emi = r > 0 ? (eligible * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : eligible / n;
    const totalPayable = emi * n;
    return { collateral, eligible, emi, totalPayable, interest: totalPayable - eligible };
  }, [grams, ltv, rate, months, gold22]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Gold Pledged (g, 22K)</Label>
          <Input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} /></div>
        <div><Label className="text-xs">LTV % (max 75)</Label>
          <Input type="number" value={ltv} onChange={(e) => setLtv(e.target.value)} /></div>
        <div><Label className="text-xs">Interest % p.a.</Label>
          <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
        <div><Label className="text-xs">Tenure (months)</Label>
          <Input type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></div>
      </div>
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <Row label="Collateral Value" value={inr(collateral)} />
        <Row label="Loan Eligible" value={inr(eligible)} strong />
        <Row label="Monthly EMI" value={inr(emi)} />
        <Row label="Total Interest" value={inr(interest)} />
        <div className="flex justify-between pt-2 mt-1 border-t border-border">
          <span className="text-sm font-semibold flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />Total Payable</span>
          <span className="text-sm font-bold text-primary">{inr(totalPayable)}</span>
        </div>
      </div>
    </div>
  );
};
