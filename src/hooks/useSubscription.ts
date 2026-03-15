import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  price_inr: number;
  metals_included: string[];
  features_included: string[];
  is_active: boolean;
  sort_order: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  amount_paid: number;
  subscription_plans?: SubscriptionPlan;
}

export const useSubscription = (userId?: string) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (userId) fetchActiveSubscription(userId);
    else {
      setActiveSubscription(null);
      setIsLoading(false);
    }
  }, [userId]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (data) setPlans(data as unknown as SubscriptionPlan[]);
  };

  const fetchActiveSubscription = async (uid: string) => {
    setIsLoading(true);
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", uid)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveSubscription(data as unknown as UserSubscription | null);
    setIsLoading(false);
  };

  const hasAccess = (metal?: string, feature?: string): boolean => {
    if (!activeSubscription?.subscription_plans) return false;
    const plan = activeSubscription.subscription_plans;
    if (metal && !plan.metals_included.includes(metal)) return false;
    if (feature && !plan.features_included.includes(feature)) return false;
    return true;
  };

  return { plans, activeSubscription, isLoading, hasAccess, refetch: () => userId && fetchActiveSubscription(userId) };
};
