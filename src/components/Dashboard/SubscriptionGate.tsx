import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  hasAccess: boolean;
  featureName?: string;
}

export const SubscriptionGate = ({ children, hasAccess, featureName }: SubscriptionGateProps) => {
  const navigate = useNavigate();

  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative">
      <div className="filter blur-sm pointer-events-none select-none opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
        <div className="text-center space-y-3 p-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {featureName ? `${featureName} is a premium feature` : "Premium Feature"}
          </p>
          <Button size="sm" onClick={() => navigate("/pricing")} className="bg-gradient-primary">
            <Crown className="w-3 h-3 mr-1" /> Upgrade Plan
          </Button>
        </div>
      </div>
    </div>
  );
};
