import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Mail, Lock, User, Chrome, TrendingUp, Brain, BarChart3,
  MapPin, Clock, Shield, Crown, Zap, LineChart, Bell, CalendarDays, Gift,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
  { icon: TrendingUp, label: "Live Metal Prices", desc: "Real-time Gold, Silver, Platinum & Diamond rates", free: true },
  { icon: Brain, label: "AI Recommendations", desc: "Smart buy/sell signals powered by AI", free: false },
  { icon: BarChart3, label: "365-Day Predictions", desc: "AI-driven price forecasts with confidence scoring", free: false },
  { icon: Zap, label: "Buy/Sell Timing", desc: "Optimal entry & exit points for maximum profit", free: false },
  { icon: LineChart, label: "Technical Analysis", desc: "RSI, MACD, Bollinger Bands & more", free: false },
  { icon: MapPin, label: "City-wise Rates", desc: "Compare prices across major Indian cities", free: false },
  { icon: Clock, label: "Historical Data", desc: "Charts & tables of past price movements", free: false },
  { icon: CalendarDays, label: "Investment Planner", desc: "Today's best investment plan curated by AI", free: false },
];

const PLANS = [
  { name: "Free Trial", price: "₹0", duration: "3 days", highlight: "All features unlocked", badge: "free" as const },
  { name: "Weekly", price: "From ₹79", duration: "7 days", highlight: "Gold / Silver / All Metals", badge: null },
  { name: "Monthly", price: "From ₹249", duration: "30 days", highlight: "AI Recommendations included", badge: "popular" as const },
  { name: "Yearly", price: "₹3,999", duration: "365 days", highlight: "Best value — full access", badge: "best" as const },
];

const Auth = () => {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  useEffect(() => {
    if (!isAuthLoading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthLoading, session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) toast.error(error.message);
    else { toast.success("Logged in successfully!"); navigate("/dashboard"); }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { full_name: signupName }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
    else toast.success("Account created! You can sign in now.");
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/dashboard` });
    if (error) toast.error("Google sign-in failed");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-primary text-primary-foreground py-8 px-4 text-center">
        <div className="inline-flex items-center gap-2 p-3 bg-white/10 rounded-xl mb-3">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold">MetalPredict Pro</h1>
        <p className="text-primary-foreground/80 mt-1 text-sm">AI-Powered Jewellery Rate Predictions & Market Intelligence</p>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 98.5% Accuracy</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 24/7 Live Data</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Free Trial Banner */}
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
          <Gift className="w-6 h-6 text-success shrink-0" />
          <div>
            <p className="font-semibold text-foreground text-sm">🎉 Start with 3 Days Free — No credit card needed</p>
            <p className="text-xs text-muted-foreground">Sign up now and unlock every premium feature instantly for 3 full days.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Features + Plans */}
          <div className="space-y-5 order-2 lg:order-1">
            {/* Features */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Platform Features
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                    <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{f.label}</span>
                        {f.free && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plans */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Crown className="w-5 h-5 text-warning" /> Subscription Plans
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {PLANS.map((p) => (
                  <div
                    key={p.name}
                    className={`relative p-3 rounded-lg border bg-card transition-colors ${
                      p.badge === "best" ? "border-primary ring-1 ring-primary/30" : "border-border"
                    }`}
                  >
                    {p.badge === "best" && (
                      <Badge className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[10px]">Best Value</Badge>
                    )}
                    {p.badge === "free" && (
                      <Badge className="absolute -top-2 right-2 bg-success text-success-foreground text-[10px]">Free</Badge>
                    )}
                    {p.badge === "popular" && (
                      <Badge className="absolute -top-2 right-2 bg-warning text-warning-foreground text-[10px]">Popular</Badge>
                    )}
                    <p className="font-semibold text-foreground text-sm">{p.name}</p>
                    <p className="text-lg font-bold text-primary">{p.price}</p>
                    <p className="text-[11px] text-muted-foreground">{p.duration}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                      <CheckCircle2 className="w-3 h-3 text-success mt-0.5 shrink-0" />
                      {p.highlight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Auth Card */}
          <div className="order-1 lg:order-2">
            <Card className="border-border bg-card sticky top-6">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-foreground">Get Started</CardTitle>
                <CardDescription>Sign in or create an account to access predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full mb-4" onClick={handleGoogleLogin} disabled={isLoading}>
                  <Chrome className="w-4 h-4 mr-2" /> Continue with Google
                </Button>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>

                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="login-email" type="email" placeholder="you@example.com" className="pl-9" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="login-password" type="password" placeholder="••••••••" className="pl-9" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-name" type="text" placeholder="John Doe" className="pl-9" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-email" type="email" placeholder="you@example.com" className="pl-9" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-password" type="password" placeholder="••••••••" className="pl-9" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} />
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create Free Account"}
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center">
                        🎉 3-day free trial with full access — no payment required
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trust footer */}
        <div className="grid grid-cols-3 gap-4 text-center py-4 border-t border-border">
          <div>
            <div className="text-2xl font-bold text-primary">98.5%</div>
            <p className="text-xs text-muted-foreground">Prediction Accuracy</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-success">6+</div>
            <p className="text-xs text-muted-foreground">Metals Tracked</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-warning">24/7</div>
            <p className="text-xs text-muted-foreground">Live Data</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
