import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateSubscriptionCustomer } from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, UserPlus, Users } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  
  // New customer form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  const updateCustomer = useUpdateSubscriptionCustomer();

  useEffect(() => {
    if (open && user?.id) {
      fetchCustomers();
      setSelectedCustomerId(currentCustomerId || '');
      // Reset new customer form
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setActiveTab('existing');
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

  const handleSelectExistingCustomer = async (e: React.FormEvent) => {
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

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newCustomerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    
    if (newCustomerName.trim().length < 2) {
      toast.error('Customer name must be at least 2 characters');
      return;
    }
    
    if (!newCustomerPhone.trim()) {
      toast.error('Please enter phone number');
      return;
    }
    
    if (newCustomerPhone.trim().length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }
    
    setLoading(true);

    try {
      // First, create the new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          seller_id: user.id,
          full_name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          email: newCustomerEmail.trim() || null,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating customer:', createError);
        toast.error('Failed to create customer');
        return;
      }

      if (!newCustomer?.id) {
        toast.error('Failed to create customer');
        return;
      }

      // Then update the subscription with the new customer
      await updateCustomer.mutateAsync({
        subscriptionId,
        customerId: newCustomer.id,
      });

      toast.success(`Customer "${newCustomerName.trim()}" created and assigned`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create and assign customer');
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
        
        <div className="p-3 bg-muted/50 rounded-lg text-sm mb-4">
          <p className="text-muted-foreground">Current customer:</p>
          <p className="font-medium">{currentCustomerName}</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'existing' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Existing
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-4">
            <form onSubmit={handleSelectExistingCustomer} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Customer *</Label>
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
          </TabsContent>

          <TabsContent value="new" className="mt-4">
            <form onSubmit={handleCreateNewCustomer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newName">Full Name *</Label>
                <Input
                  id="newName"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPhone">Phone Number *</Label>
                <Input
                  id="newPhone"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEmail">Email (Optional)</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="Enter email address"
                  maxLength={255}
                />
              </div>

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
                  disabled={loading || !newCustomerName.trim() || !newCustomerPhone.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create & Assign'
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
