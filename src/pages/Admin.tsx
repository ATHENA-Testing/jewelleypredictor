import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { AdminRatesPanel } from "@/components/Admin/AdminRatesPanel";
import { AdminUserActivity } from "@/components/Admin/AdminUserActivity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, user, isAdmin, navigate]);

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header showRefresh={false} />
        <main className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showRefresh={false} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage users, plans, revenue and market rates</p>
        </div>
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="users">User Activity</TabsTrigger>
            <TabsTrigger value="rates">Market Rates</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <AdminUserActivity />
          </TabsContent>
          <TabsContent value="rates">
            <AdminRatesPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
