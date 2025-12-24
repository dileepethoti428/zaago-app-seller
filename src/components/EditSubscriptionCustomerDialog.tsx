import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateSubscriptionCustomer } from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditSubscriptionCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  currentCustomerId: string | null;
  currentCustomerName: string;
}

export const EditSubscriptionCustomerDialog = ({
  open,
  onOpenChange,
  subscriptionId,
  currentCustomerId,
  currentCustomerName,
}: EditSubscriptionCustomerDialogProps) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(currentCustomerId || '');
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(false);

  const updateCustomer = useUpdateSubscriptionCustomer();

  useEffect(() => {
    if (open && user?.id) {
      fetchCustomers();
      setSelectedCustomerId(currentCustomerId || '');
    }
  }, [open, user?.id, currentCustomerId]);

  const fetchCustomers = async () => {
    if (!user?.id) return;
    setFetchingCustomers(true);
    
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, full_name, phone, email')
        .eq('seller_id', user.id)
        .order('full_name');
      
      if (data) setCustomers(data);
    } finally {
      setFetchingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    
    if (selectedCustomerId === currentCustomerId) {
      toast.info('Customer is already assigned to this subscription');
      onOpenChange(false);
      return;
    }
    
    setLoading(true);

    try {
      await updateCustomer.mutateAsync({
        subscriptionId,
        customerId: selectedCustomerId,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Customer</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-muted-foreground">Current customer:</p>
            <p className="font-medium">{currentCustomerName}</p>
          </div>
          
          <div className="space-y-2">
            <Label>Select New Customer *</Label>
            {fetchingCustomers ? (
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading customers...</span>
              </div>
            ) : (
              <Select 
                value={selectedCustomerId} 
                onValueChange={setSelectedCustomerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {selectedCustomer && selectedCustomerId !== currentCustomerId && (
            <div className="p-3 bg-primary/10 rounded-lg text-sm">
              <p className="text-muted-foreground">New customer:</p>
              <p className="font-medium">{selectedCustomer.full_name}</p>
              <p className="text-muted-foreground">{selectedCustomer.phone}</p>
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !selectedCustomerId || selectedCustomerId === currentCustomerId}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Customer'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};