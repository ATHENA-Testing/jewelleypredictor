import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: string;
  metal: string;
  threshold: number;
  type: "above" | "below";
  enabled: boolean;
}

export const AlertConfiguration = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlert, setNewAlert] = useState({
    metal: "Gold",
    threshold: 0,
    type: "above" as "above" | "below",
  });

  const addAlert = () => {
    if (newAlert.threshold <= 0) {
      toast.error("Please enter a valid threshold");
      return;
    }

    const alert: Alert = {
      id: Date.now().toString(),
      ...newAlert,
      enabled: true,
    };

    setAlerts([...alerts, alert]);
    toast.success("Alert created successfully!");
    setNewAlert({ metal: "Gold", threshold: 0, type: "above" });
  };

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
    toast.success("Alert removed");
  };

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
  };

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Price Alerts</h3>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="metal">Metal</Label>
            <Select value={newAlert.metal} onValueChange={(value) => setNewAlert({ ...newAlert, metal: value })}>
              <SelectTrigger id="metal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
                <SelectItem value="Palladium">Palladium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type">Condition</Label>
            <Select value={newAlert.type} onValueChange={(value: "above" | "below") => setNewAlert({ ...newAlert, type: value })}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Price Above</SelectItem>
                <SelectItem value="below">Price Below</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="threshold">Threshold ($)</Label>
            <Input
              id="threshold"
              type="number"
              value={newAlert.threshold || ""}
              onChange={(e) => setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) })}
              placeholder="2000"
            />
          </div>

          <div className="flex items-end">
            <Button onClick={addAlert} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Alert
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No alerts configured yet. Create your first alert above.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border"
            >
              <div className="flex items-center gap-4">
                <Switch
                  checked={alert.enabled}
                  onCheckedChange={() => toggleAlert(alert.id)}
                />
                <div>
                  <p className="font-medium text-foreground">
                    {alert.metal} {alert.type === "above" ? ">" : "<"} ${alert.threshold}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Alert when price goes {alert.type} ${alert.threshold}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAlert(alert.id)}
              >
                <Trash2 className="w-4 h-4 text-danger" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
