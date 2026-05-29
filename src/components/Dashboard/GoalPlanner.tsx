import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Trash2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { toast } from "sonner";

type Goal = {
  id: string;
  goal_name: string;
  metal: string;
  target_grams: number;
  target_date: string;
  monthly_budget: number | null;
};

const METALS = ["Gold 22K", "Gold 24K", "Silver", "Platinum"];
const APPRECIATION = 0.08; // 8% annual

export const GoalPlanner = () => {
  const { user } = useAuth();
  const { metals } = useMetalPrices();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ goal_name: "", metal: "Gold 22K", target_grams: "", target_date: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_goals").select("*").eq("user_id", user.id).order("target_date");
    setGoals((data ?? []) as Goal[]);
  };

  useEffect(() => { load(); }, [user]);

  const priceFor = (metal: string) => metals.find((m) => m.metal === metal)?.pricePerGram ?? 0;

  const monthsUntil = (date: string) => {
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
    return Math.max(1, Math.round(diff));
  };

  const computePlan = (g: Goal) => {
    const current = priceFor(g.metal);
    const months = monthsUntil(g.target_date);
    const futurePrice = current * Math.pow(1 + APPRECIATION, months / 12);
    const totalCost = futurePrice * Number(g.target_grams);
    const monthlySIP = totalCost / months;
    const todayCost = current * Number(g.target_grams);
    return { current, futurePrice, totalCost, monthlySIP, months, todayCost };
  };

  const handleAdd = async () => {
    if (!user || !form.goal_name || !form.target_grams || !form.target_date) {
      toast.error("Fill all fields");
      return;
    }
    const { error } = await supabase.from("user_goals").insert({
      user_id: user.id,
      goal_name: form.goal_name,
      metal: form.metal,
      target_grams: Number(form.target_grams),
      target_date: form.target_date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Goal added");
    setForm({ goal_name: "", metal: "Gold 22K", target_grams: "", target_date: "" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("user_goals").delete().eq("id", id);
    load();
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-foreground">
          <span className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Goal-Based Savings Planner</span>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> New Goal
          </Button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Set a target — we'll calculate the monthly SIP at projected rates (8% annual appreciation).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border border-border rounded-lg bg-muted/30">
            <div>
              <Label className="text-xs">Goal name</Label>
              <Input value={form.goal_name} onChange={(e) => setForm({ ...form, goal_name: e.target.value })} placeholder="Wedding gold" />
            </div>
            <div>
              <Label className="text-xs">Metal</Label>
              <Select value={form.metal} onValueChange={(v) => setForm({ ...form, metal: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Target (grams)</Label>
              <Input type="number" value={form.target_grams} onChange={(e) => setForm({ ...form, target_grams: e.target.value })} placeholder="50" />
            </div>
            <div>
              <Label className="text-xs">Target date</Label>
              <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </div>
            <Button onClick={handleAdd} className="md:col-span-4 bg-gradient-primary">Save Goal</Button>
          </div>
        )}

        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No goals yet. Add your first savings target.</p>
        ) : (
          goals.map((g) => {
            const p = computePlan(g);
            return (
              <div key={g.id} className="p-3 border border-border rounded-lg bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{g.goal_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.target_grams}g {g.metal} by {new Date(g.target_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ({p.months} months)
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(g.id)}>
                    <Trash2 className="w-4 h-4 text-danger" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Today's cost</p>
                    <p className="text-sm font-bold text-foreground">₹{Math.round(p.todayCost).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-2 rounded bg-warning/10">
                    <p className="text-[10px] text-muted-foreground">Projected cost</p>
                    <p className="text-sm font-bold text-warning">₹{Math.round(p.totalCost).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-2 rounded bg-primary/10">
                    <p className="text-[10px] text-muted-foreground">Monthly SIP</p>
                    <p className="text-sm font-bold text-primary">₹{Math.round(p.monthlySIP).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-2 rounded bg-success/10">
                    <p className="text-[10px] text-muted-foreground">Future ₹/g</p>
                    <p className="text-sm font-bold text-success flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {Math.round(p.futurePrice).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
