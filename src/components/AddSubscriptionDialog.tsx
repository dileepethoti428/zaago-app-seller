import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useCreateSubscription } from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const AddSubscriptionDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState('everyday');
  const [timeSlot, setTimeSlot] = useState('morning-early');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [vacationFrom, setVacationFrom] = useState('');
  const [vacationTo, setVacationTo] = useState('');

  const createSubscription = useCreateSubscription();

  useEffect(() => {
    if (open && user?.id) {
      fetchProducts();
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any)
      .from('products')
      .select('id, name, price, stock_quantity')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name');
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('user_id, full_name, phone')
      .not('full_name', 'is', null)
      .order('full_name');
    if (data) setCustomers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createSubscription.mutateAsync({
        customerId,
        productId,
        quantity,
        deliveryType: deliveryType as any,
        timeSlot,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        address: { full_address: address, city, pincode, landmark },
        specialInstructions: specialInstructions || undefined,
        vacationFrom: vacationFrom ? new Date(vacationFrom) : undefined,
        vacationTo: vacationTo ? new Date(vacationTo) : undefined,
      });

      setOpen(false);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setProductId('');
    setQuantity(1);
    setDeliveryType('everyday');
    setTimeSlot('morning-early');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setAddress('');
    setCity('');
    setPincode('');
    setLandmark('');
    setSpecialInstructions('');
    setVacationFrom('');
    setVacationTo('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-zaago-green hover:bg-zaago-green/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Subscription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={(val: string) => setCustomerId(val)} required>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.full_name} ({c.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={productId} onValueChange={(val: string) => setProductId(val)} required>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - ₹{p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} required />
            </div>

            <div className="space-y-2">
              <Label>Delivery Type *</Label>
              <Select value={deliveryType} onValueChange={(val: string) => setDeliveryType(val)} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyday">Everyday</SelectItem>
                  <SelectItem value="weekend">Weekend</SelectItem>
                  <SelectItem value="alternate">Alternate Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Slot *</Label>
              <Select value={timeSlot} onValueChange={(val: string) => setTimeSlot(val)} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning-early">Morning (Early)</SelectItem>
                  <SelectItem value="morning-late">Morning (Late)</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Full Address *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Pincode *</Label>
              <Input value={pincode} onChange={(e) => setPincode(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Landmark</Label>
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-zaago-green hover:bg-zaago-green/90">
              {loading ? 'Creating...' : 'Create Subscription'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
