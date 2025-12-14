import { Header } from '@/components/Header';
import { AdminRatesPanel } from '@/components/Admin/AdminRatesPanel';

const Admin = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header showRefresh={false} />
      <main className="container mx-auto px-4 py-8">
        <AdminRatesPanel />
      </main>
    </div>
  );
};

export default Admin;
