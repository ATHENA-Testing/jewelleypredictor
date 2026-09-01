import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Brain, Cloud, Database, RefreshCw, ShieldCheck, PlugZap } from "lucide-react";
import { toast } from "sonner";

interface Analytics {
  total_users?: number;
  new_users_7d?: number;
  new_users_30d?: number;
  active_users_7d?: number;
  active_users_24h?: number;
  confirmed_users?: number;
  active_subscriptions?: number;
  total_alerts?: number;
  total_holdings?: number;
  total_goals?: number;
}

interface ModelRow {
  id: string;
  model_id: string;
  label: string;
  provider: string;
  enabled: boolean;
  notes: string | null;
}

interface FeatureRow {
  id: string;
  feature: string;
  label: string;
  active_model: string;
  fallback_models: string[];
  enabled: boolean;
}

interface IntegrationRow {
  id: string;
  provider_key: string;
  label: string;
  category: string;
  enabled: boolean;
  secret_name: string | null;
  secret_set: boolean;
  status: string;
  last_tested_at: string | null;
}

interface StorageRow {
  id: string;
  provider: string;
  label: string;
  is_active: boolean;
  status: string;
}

const metricItems = [
  ["total_users", "Users"],
  ["active_users_24h", "Active today"],
  ["new_users_7d", "New this week"],
  ["active_subscriptions", "Subscriptions"],
  ["total_alerts", "Price alerts"],
  ["total_holdings", "Holdings"],
] as const;

export const AdminPlatformControls = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [storage, setStorage] = useState<StorageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [analyticsResult, modelsResult, featuresResult, integrationsResult, storageResult] = await Promise.all([
      supabase.rpc("admin_platform_analytics"),
      supabase.from("ai_models").select("id, model_id, label, provider, enabled, notes").order("provider").order("label"),
      supabase.from("ai_feature_config").select("id, feature, label, active_model, fallback_models, enabled").order("feature"),
      supabase.from("integration_configs").select("id, provider_key, label, category, enabled, secret_name, secret_set, status, last_tested_at").order("category").order("label"),
      supabase.from("storage_config").select("id, provider, label, is_active, status").order("provider"),
    ]);

    if (analyticsResult.error) {
      toast.error("Platform controls are available to the super admin only");
    }
    setAnalytics((analyticsResult.data as Analytics | null) ?? null);
    setModels((modelsResult.data as ModelRow[]) ?? []);
    setFeatures((featuresResult.data as FeatureRow[]) ?? []);
    setIntegrations((integrationsResult.data as IntegrationRow[]) ?? []);
    setStorage((storageResult.data as StorageRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleModel = async (model: ModelRow) => {
    setSaving(model.id);
    const { error } = await supabase.from("ai_models").update({ enabled: !model.enabled, updated_at: new Date().toISOString() }).eq("id", model.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else setModels((items) => items.map((item) => item.id === model.id ? { ...item, enabled: !item.enabled } : item));
  };

  const toggleFeature = async (feature: FeatureRow) => {
    setSaving(feature.id);
    const { error } = await supabase.from("ai_feature_config").update({ enabled: !feature.enabled, updated_at: new Date().toISOString() }).eq("id", feature.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else setFeatures((items) => items.map((item) => item.id === feature.id ? { ...item, enabled: !item.enabled } : item));
  };

  const toggleIntegration = async (integration: IntegrationRow) => {
    setSaving(integration.id);
    const { error } = await supabase.from("integration_configs").update({ enabled: !integration.enabled, updated_at: new Date().toISOString() }).eq("id", integration.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else setIntegrations((items) => items.map((item) => item.id === integration.id ? { ...item, enabled: !item.enabled } : item));
  };

  const setStorageProvider = async (provider: StorageRow) => {
    setSaving(provider.id);
    const { error } = await supabase.from("storage_config").update({ is_active: true, status: "active", updated_at: new Date().toISOString() }).eq("id", provider.id);
    if (!error) {
      await supabase.from("storage_config").update({ is_active: false, status: "available", updated_at: new Date().toISOString() }).neq("id", provider.id);
    }
    setSaving(null);
    if (error) toast.error(error.message);
    else setStorage((items) => items.map((item) => ({ ...item, is_active: item.id === provider.id, status: item.id === provider.id ? "active" : "available" })));
  };

  if (loading) return <Skeleton className="h-[520px] rounded-lg" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {metricItems.map(([key, label]) => (
          <Card key={key} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{Number(analytics?.[key] ?? 0).toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!analytics && <Card className="border-warning/40 bg-warning/5"><CardContent className="p-4 text-sm text-foreground">Super-admin analytics and configuration controls are restricted by the backend.</CardContent></Card>}

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />AI model registry</CardTitle><CardDescription>Enable or disable models used by the prediction and assistant fallback chains.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {models.map((model) => <div key={model.id} className="flex items-center justify-between gap-3 border border-border p-3 rounded-md"><div className="min-w-0"><p className="text-sm font-medium text-foreground truncate">{model.label}</p><p className="text-xs text-muted-foreground truncate">{model.provider} · {model.model_id}</p></div><div className="flex items-center gap-2"><Badge variant={model.enabled ? "default" : "secondary"}>{model.enabled ? "Enabled" : "Off"}</Badge><Switch checked={model.enabled} disabled={saving === model.id} onCheckedChange={() => void toggleModel(model)} aria-label={`Toggle ${model.label}`} /></div></div>)}
          {models.length === 0 && <p className="text-sm text-muted-foreground">No model configuration is visible for this account.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />AI features</CardTitle><CardDescription>Control which intelligence surfaces are available.</CardDescription></CardHeader><CardContent className="space-y-3">{features.map((feature) => <div key={feature.id} className="flex items-center justify-between gap-3 border border-border p-3 rounded-md"><div className="min-w-0"><p className="text-sm font-medium text-foreground">{feature.label}</p><p className="text-xs text-muted-foreground truncate">Primary: {feature.active_model}</p></div><Switch checked={feature.enabled} disabled={saving === feature.id} onCheckedChange={() => void toggleFeature(feature)} aria-label={`Toggle ${feature.label}`} /></div>)}{features.length === 0 && <p className="text-sm text-muted-foreground">No feature configuration is visible for this account.</p>}</CardContent></Card>
        <Card className="border-border"><CardHeader><CardTitle className="flex items-center gap-2"><PlugZap className="h-5 w-5 text-primary" />Integrations & plugins</CardTitle><CardDescription>Secrets are never displayed; only availability and service state are shown.</CardDescription></CardHeader><CardContent className="space-y-3">{integrations.map((integration) => <div key={integration.id} className="flex items-center justify-between gap-3 border border-border p-3 rounded-md"><div className="min-w-0"><p className="text-sm font-medium text-foreground">{integration.label}</p><p className="text-xs text-muted-foreground">{integration.category} · {integration.status}</p></div><div className="flex items-center gap-2"><Badge variant={integration.secret_set ? "default" : "outline"}>{integration.secret_set ? "Key set" : "Needs key"}</Badge><Switch checked={integration.enabled} disabled={saving === integration.id} onCheckedChange={() => void toggleIntegration(integration)} aria-label={`Toggle ${integration.label}`} /></div></div>)}{integrations.length === 0 && <p className="text-sm text-muted-foreground">No integration configuration is visible for this account.</p>}</CardContent></Card>
      </div>

      <Card className="border-border"><CardHeader><CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" />Storage provider</CardTitle><CardDescription>Google Drive remains deferred; app cloud storage is the active default.</CardDescription></CardHeader><CardContent className="space-y-3">{storage.map((provider) => <div key={provider.id} className="flex items-center justify-between gap-3 border border-border p-3 rounded-md"><div className="flex items-center gap-3"><Database className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">{provider.label}</p><p className="text-xs text-muted-foreground">{provider.status}</p></div></div><Button variant={provider.is_active ? "default" : "outline"} size="sm" disabled={provider.is_active || saving === provider.id} onClick={() => void setStorageProvider(provider)}>{provider.is_active ? <><ShieldCheck className="h-4 w-4 mr-1" />Active</> : "Use provider"}</Button></div>)}{storage.length === 0 && <p className="text-sm text-muted-foreground">No storage configuration is visible for this account.</p>}</CardContent></Card>
    </div>
  );
};