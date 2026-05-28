import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Briefcase, Plus, Trash2, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { toast } from "sonner";

interface Holding {
  id: string;
  metal: string;
  quantity_grams: number;
  purchase_price_per_gram: number;
  purchase_date: string;
  notes: string | null;
}

const METALS = ["Gold 24K", "Gold 22K", "Silver", "Platinum", "Palladium", "Diamond"];

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const PortfolioTracker = () => {
  const { user } = useAuth();
  const { metals } = useMetalPrices();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    metal: "Gold 22K",
    quantity_grams: "",
    purchase_price_per_gram: "",
    purchase_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const livePrices: Record<string, number> = {};
  metals.forEach((m) => (livePrices[m.metal] = m.pricePerGram));

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_holdings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load holdings");
    else setHoldings((data as Holding[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const addHolding = async () => {
    if (!user) return;
    const q = parseFloat(form.quantity_grams);
    const p = parseFloat(form.purchase_price_per_gram);
    if (!q || !p) return toast.error("Enter valid quantity & price");
    const { error } = await supabase.from("user_holdings").insert({
      user_id: user.id,
      metal: form.metal,
      quantity_grams: q,
      purchase_price_per_gram: p,
      purchase_date: form.purchase_date,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Holding added");
    setOpen(false);
    setForm({ ...form, quantity_grams: "", purchase_price_per_gram: "", notes: "" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("user_holdings").delete().eq("id", id);
    if (error) return toast.error("Failed to delete");
    toast.success("Removed");
    setHoldings((h) => h.filter((x) => x.id !== id));
  };

  const summary = holdings.reduce(
    (acc, h) => {
      const live = livePrices[h.metal] || h.purchase_price_per_gram;
      const invested = h.quantity_grams * h.purchase_price_per_gram;
      const current = h.quantity_grams * live;
      acc.invested += invested;
      acc.current += current;
      return acc;
    },
    { invested: 0, current: 0 }
  );
  const pnl = summary.current - summary.invested;
  const roi = summary.invested ? (pnl / summary.invested) * 100 : 0;

  return (
    <Card className="border-border bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg"><Briefcase className="w-4 h-4 text-primary" /></div>
          <CardTitle className="text-lg">My Portfolio</CardTitle>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Holding</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Metal</Label>
                <Select value={form.metal} onValueChange={(v) => setForm({ ...form, metal: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity (g{form.metal === "Diamond" ? " / ct" : ""})</Label>
                  <Input type="number" step="0.01" value={form.quantity_grams} onChange={(e) => setForm({ ...form, quantity_grams: e.target.value })} /></div>
                <div><Label>Buy Price / unit (₹)</Label>
                  <Input type="number" step="0.01" value={form.purchase_price_per_gram} onChange={(e) => setForm({ ...form, purchase_price_per_gram: e.target.value })} /></div>
              </div>
              <div><Label>Purchase Date</Label>
                <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
              <div><Label>Notes (optional)</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Wedding chain, 916 hallmark" /></div>
            </div>
            <DialogFooter><Button onClick={addHolding} className="bg-gradient-primary">Save Holding</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invested</p>
            <p className="text-sm font-bold text-foreground flex items-center"><IndianRupee className="w-3 h-3" />{summary.invested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Value</p>
            <p className="text-sm font-bold text-primary flex items-center"><IndianRupee className="w-3 h-3" />{summary.current.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          </div>
          <div className={`p-3 rounded-lg border ${pnl >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">P&L</p>
            <p className={`text-sm font-bold flex items-center gap-1 ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
              {pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {inr(Math.abs(pnl))} <span className="text-[10px]">({roi.toFixed(2)}%)</span>
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : holdings.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No holdings yet. Add your first metal purchase to track P&L.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {holdings.map((h) => {
              const live = livePrices[h.metal] || h.purchase_price_per_gram;
              const invested = h.quantity_grams * h.purchase_price_per_gram;
              const current = h.quantity_grams * live;
              const diff = current - invested;
              const pct = invested ? (diff / invested) * 100 : 0;
              return (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{h.metal}</Badge>
                      <span className="text-xs text-muted-foreground">{h.quantity_grams}g · {new Date(h.purchase_date).toLocaleDateString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Buy {inr(h.purchase_price_per_gram)}/g · Now {inr(live)}/g
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${diff >= 0 ? "text-success" : "text-destructive"}`}>
                        {diff >= 0 ? "+" : ""}{inr(diff)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{pct.toFixed(2)}%</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(h.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
