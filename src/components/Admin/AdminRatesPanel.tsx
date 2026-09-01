import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, RefreshCw, Shield } from 'lucide-react';

interface ManualRate {
  id: string;
  metal: string;
  price_per_gram: number;
  updated_at: string;
  notes: string | null;
}

export const AdminRatesPanel = () => {
  const [rates, setRates] = useState<ManualRate[]>([]);
  const [editedRates, setEditedRates] = useState<Record<string, { price: string; notes: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    fetchRates();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
    setIsAdmin(data === true);
  };

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_manual_market_rates');

      if (error) throw error;

      setRates(data || []);
      
      const initialEdits: Record<string, { price: string; notes: string }> = {};
      data?.forEach(rate => {
        initialEdits[rate.metal] = {
          price: rate.price_per_gram.toString(),
          notes: rate.notes || ''
        };
      });
      setEditedRates(initialEdits);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rates",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceChange = (metal: string, value: string) => {
    setEditedRates(prev => ({
      ...prev,
      [metal]: { ...prev[metal], price: value }
    }));
  };

  const handleNotesChange = (metal: string, value: string) => {
    setEditedRates(prev => ({
      ...prev,
      [metal]: { ...prev[metal], notes: value }
    }));
  };

  const handleSave = async (metal: string) => {
    const edited = editedRates[metal];
    if (!edited) return;

    const price = parseFloat(edited.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid positive number",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('admin_set_manual_market_rate', {
        _metal: metal,
        _price_per_gram: price,
        _notes: edited.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Rate Updated",
        description: `${metal} rate updated to ₹${price.toLocaleString('en-IN')}/gram`
      });

      fetchRates();
    } catch (error) {
      console.error('Error updating rate:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update rate. Make sure you have admin privileges.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const metal of Object.keys(editedRates)) {
        const edited = editedRates[metal];
        const price = parseFloat(edited.price);
        
        if (isNaN(price) || price <= 0) continue;

        await supabase.rpc('admin_set_manual_market_rate', {
          _metal: metal,
          _price_per_gram: price,
          _notes: edited.notes || null,
        });
      }

      toast({
        title: "All Rates Updated",
        description: "All metal rates have been updated successfully"
      });

      fetchRates();
    } catch (error) {
      console.error('Error updating rates:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update some rates",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You need admin privileges to access this panel. Please log in with an admin account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Rate Override Panel
            </CardTitle>
            <CardDescription>
              Manually set market rates when APIs are unavailable or inaccurate
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchRates}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              Save All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rates.map(rate => (
            <Card key={rate.id} className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{rate.metal}</CardTitle>
                <CardDescription className="text-xs">
                  Last updated: {new Date(rate.updated_at).toLocaleString('en-IN')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor={`price-${rate.metal}`}>
                    Price per {rate.metal === 'Diamond' ? 'carat' : 'gram'} (₹)
                  </Label>
                  <Input
                    id={`price-${rate.metal}`}
                    type="number"
                    value={editedRates[rate.metal]?.price || ''}
                    onChange={(e) => handlePriceChange(rate.metal, e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor={`notes-${rate.metal}`}>Notes</Label>
                  <Textarea
                    id={`notes-${rate.metal}`}
                    value={editedRates[rate.metal]?.notes || ''}
                    onChange={(e) => handleNotesChange(rate.metal, e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                  />
                </div>
                <Button 
                  size="sm" 
                  className="w-full" 
                  onClick={() => handleSave(rate.metal)}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save {rate.metal}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
