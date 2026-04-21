import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Crown, Sparkles } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  hasAccess: boolean;
  featureName?: string;
}

export const SubscriptionGate = ({ children, hasAccess, featureName }: SubscriptionGateProps) => {
  const navigate = useNavigate();

  if (hasAccess) return <>{children}</>;

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card to-muted/30">
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              {featureName || "Premium Feature"}
              <Sparkles className="w-3.5 h-3.5 text-warning" />
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Upgrade your plan to unlock this feature
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/pricing")} className="bg-gradient-primary shrink-0">
          <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade
        </Button>
      </CardContent>
    </Card>
  );
};
