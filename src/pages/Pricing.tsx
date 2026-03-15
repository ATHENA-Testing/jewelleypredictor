import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans, activeSubscription } = useSubscription(user?.id);

  const weeklyPlans = plans.filter(p => p.duration_days === 7);
  const monthlyPlans = plans.filter(p => p.duration_days === 30);
  const yearlyPlans = plans.filter(p => p.duration_days === 365);

  const handleSubscribe = (plan: typeof plans[0]) => {
    if (!user) {
      toast.info("Please sign in first");
      navigate("/auth");
      return;
    }
    // Razorpay integration will be added in Phase 2
    toast.info(`Razorpay payment gateway integration coming soon for "${plan.name}" plan (₹${plan.price_inr})`);
  };

  const renderPlanCard = (plan: typeof plans[0], featured = false) => (
    <Card
      key={plan.id}
      className={`relative border-border ${featured ? "border-2 border-primary ring-2 ring-primary/20" : ""}`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            <Crown className="w-3 h-3 mr-1" /> Most Popular
          </Badge>
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg text-foreground">{plan.name}</CardTitle>
        <CardDescription className="text-xs">{plan.description}</CardDescription>
        <div className="mt-2">
          <span className="text-3xl font-bold text-foreground">₹{plan.price_inr}</span>
          <span className="text-muted-foreground text-sm">
            /{plan.duration_days === 7 ? "week" : plan.duration_days === 30 ? "month" : "year"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Metals included:</p>
          <div className="flex flex-wrap gap-1">
            {plan.metals_included.map(m => (
              <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Features:</p>
          {plan.features_included.map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-foreground">
              <Check className="w-3 h-3 text-success" />
              <span className="capitalize">{f.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
        <Button
          className="w-full bg-gradient-primary"
          onClick={() => handleSubscribe(plan)}
          disabled={activeSubscription?.plan_id === plan.id}
        >
          {activeSubscription?.plan_id === plan.id ? "Active" : "Subscribe Now"}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
          </div>
          <p className="text-muted-foreground">Unlock AI-powered metal predictions & market insights</p>
        </div>

        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-card border border-border">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {weeklyPlans.map((p, i) => renderPlanCard(p, i === weeklyPlans.length - 1))}
            </div>
          </TabsContent>
          <TabsContent value="monthly">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {monthlyPlans.map((p, i) => renderPlanCard(p, i === monthlyPlans.length - 1))}
            </div>
          </TabsContent>
          <TabsContent value="yearly">
            <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
              {yearlyPlans.map(p => renderPlanCard(p, true))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Pricing;
