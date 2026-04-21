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
import {
  Sparkles, Mail, Lock, User, Chrome, Shield, TrendingUp, Clock, Gift,
} from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (!isAuthLoading && session) navigate("/dashboard", { replace: true });
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

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Check your email for the password reset link");
      setActiveTab("login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-primary text-primary-foreground py-6 px-4 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-xl mb-2">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold">MetalPredict Pro</h1>
        <p className="text-primary-foreground/80 mt-1 text-sm">AI-Powered Jewellery Rate Predictions</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs flex-wrap">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 98.5% Accuracy</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 24/7 Live Data</span>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-6 max-w-md w-full flex flex-col justify-center">
        {/* Trial banner */}
        <div className="bg-success/10 border border-success/30 rounded-lg p-3 mb-4 flex items-center gap-3">
          <Gift className="w-5 h-5 text-success shrink-0" />
          <p className="text-xs text-foreground">
            <span className="font-semibold">3 Days Free</span> — full access on signup, no card required.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-foreground">Welcome</CardTitle>
            <CardDescription>Sign in or create your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mb-4" onClick={handleGoogleLogin} disabled={isLoading}>
              <Chrome className="w-4 h-4 mr-2" /> Continue with Google
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="forgot">Reset</TabsTrigger>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button type="button" onClick={() => setActiveTab("forgot")} className="text-xs text-primary hover:underline">
                        Forgot?
                      </button>
                    </div>
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

              <TabsContent value="forgot">
                <form onSubmit={handleForgot} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Enter your registered email and we'll send a password reset link.
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="forgot-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="forgot-email" type="email" placeholder="you@example.com" className="pl-9" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setActiveTab("login")}>
                    Back to Sign In
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
