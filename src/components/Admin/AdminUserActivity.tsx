import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, IndianRupee, Crown, Clock, TrendingUp, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface UserActivity {
  user_id: string;
  email: string;
  full_name: string | null;
  signed_up_at: string;
  role: string;
  plan_name: string | null;
  plan_price: number | null;
  subscription_status: string | null;
  starts_at: string | null;
  expires_at: string | null;
  amount_paid: number;
  is_trial: boolean;
  is_active: boolean;
  days_remaining: number;
}

interface RevenueRow {
  total_users: number;
  active_paid: number;
  active_trials: number;
  expired_users: number;
  total_revenue: number;
  revenue_30d: number;
  plan_name: string;
  plan_subscribers: number;
  plan_revenue: number;
}

const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

export const AdminUserActivity = () => {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    const [{ data: activity, error: e1 }, { data: rev, error: e2 }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)("admin_get_user_activity"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)("admin_get_revenue_summary"),
    ]);
    if (e1 || e2) toast.error(e1?.message || e2?.message || "Failed to load admin data");
    setUsers((activity as UserActivity[]) || []);
    setRevenue((rev as RevenueRow[]) || []);
    setIsLoading(false);
  };

  const summary = revenue[0];
  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  const statusBadge = (u: UserActivity) => {
    if (u.role === "admin") return <Badge className="bg-warning text-warning-foreground"><Crown className="w-3 h-3 mr-1" />Super Admin</Badge>;
    if (u.is_active && u.is_trial) return <Badge className="bg-success/20 text-success border-success/30">Trial · {u.days_remaining}d</Badge>;
    if (u.is_active) return <Badge className="bg-primary/20 text-primary border-primary/30">Active · {u.days_remaining}d</Badge>;
    if (u.expires_at) return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
    return <Badge variant="outline">No Plan</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Users</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{summary.total_users}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Active Paid</span>
                  <Crown className="w-4 h-4 text-warning" />
                </div>
                <p className="text-2xl font-bold text-success">{summary.active_paid}</p>
                <p className="text-[11px] text-muted-foreground">{summary.active_trials} on trial</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Revenue</span>
                  <IndianRupee className="w-4 h-4 text-success" />
                </div>
                <p className="text-2xl font-bold text-foreground">{fmtINR(summary.total_revenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Last 30 Days</span>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">{fmtINR(summary.revenue_30d)}</p>
                <p className="text-[11px] text-muted-foreground">{summary.expired_users} expired</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Plan Breakdown */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-4 h-4 text-warning" /> Revenue by Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {revenue.map((r) => (
                <div key={r.plan_name} className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">{r.plan_name}</p>
                  <p className="text-xs text-muted-foreground">{r.plan_subscribers} subscribers</p>
                  <p className="text-lg font-bold text-success mt-1">{fmtINR(r.plan_revenue)}</p>
                </div>
              ))}
              {revenue.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">No plans configured.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> User Activity ({filtered.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="w-4 h-4 mr-2" /> No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {u.full_name || u.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{u.plan_name || "—"}</span>
                      </TableCell>
                      <TableCell>{statusBadge(u)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtDate(u.signed_up_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{fmtDate(u.expires_at)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-foreground">{fmtINR(u.amount_paid)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
