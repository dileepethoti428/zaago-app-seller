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
import { toast } from 'sonner';

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
  const [subscriptionDuration, setSubscriptionDuration] = useState<'week' | 'month' | '6months'>('month');

  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

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
      .eq('seller_id', user.id)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name');
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    if (!user?.id) return;
    
    const { data } = await (supabase as any)
      .from('customers')
      .select('id, full_name, phone, email')
      .eq('seller_id', user.id)
      .order('full_name');
    if (data) setCustomers(data);
  };

  const calculatePricing = () => {
    if (!productId || !quantity) {
      return { subtotal: 0, discount: 0, discountPercentage: 0, finalPrice: 0, deliveryCount: 0, pricePerDelivery: 0 };
    }
    
    const selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return { subtotal: 0, discount: 0, discountPercentage: 0, finalPrice: 0, deliveryCount: 0, pricePerDelivery: 0 };
    
    const pricePerDelivery = selectedProduct.price * quantity;
    
    // Calculate number of deliveries based on duration and delivery type
    let deliveryCount = 0;
    
    switch (subscriptionDuration) {
      case 'week':
        deliveryCount = deliveryType === 'everyday' ? 7 : 
                       deliveryType === 'weekend' ? 2 : 
                       deliveryType === 'alternate' ? 3 : 7;
        break;
      case 'month':
        deliveryCount = deliveryType === 'everyday' ? 30 : 
                       deliveryType === 'weekend' ? 8 : 
                       deliveryType === 'alternate' ? 15 : 30;
        break;
      case '6months':
        deliveryCount = deliveryType === 'everyday' ? 180 : 
                       deliveryType === 'weekend' ? 48 : 
                       deliveryType === 'alternate' ? 90 : 180;
        break;
    }
    
    const subtotal = pricePerDelivery * deliveryCount;
    
    // Apply discount based on duration
    const discountPercentage = subscriptionDuration === 'week' ? 4 : 
                                subscriptionDuration === 'month' ? 7 : 15;
    
    const discount = (subtotal * discountPercentage) / 100;
    const finalPrice = subtotal - discount;
    
    return { subtotal, discount, discountPercentage, finalPrice, deliveryCount, pricePerDelivery };
  };

  const calculateEndDate = (startDate: string, duration: 'week' | 'month' | '6months') => {
    const start = new Date(startDate);
    
    switch (duration) {
      case 'week':
        start.setDate(start.getDate() + 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() + 1);
        break;
      case '6months':
        start.setMonth(start.getMonth() + 6);
        break;
    }
    
    return start.toISOString().split('T')[0];
  };

  const createNewCustomer = async () => {
    if (!newCustomerName || !newCustomerPhone) {
      toast.error('Name and phone are required');
      return null;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return null;
    }

    const { data: newCustomer, error } = await (supabase as any)
      .from('customers')
      .insert({
        seller_id: user.id,
        full_name: newCustomerName,
        phone: newCustomerPhone,
        email: newCustomerEmail || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      
      if (error.code === '23505') {
        toast.error('Customer with this phone number already exists');
      } else {
        toast.error('Failed to create customer');
      }
      return null;
    }

    toast.success('Customer created successfully');
    await fetchCustomers();
    
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setShowNewCustomerForm(false);

    return newCustomer.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!productId) {
      toast.error('Please select a product');
      return;
    }
    if (!address.trim()) {
      toast.error('Please enter the delivery address');
      return;
    }
    if (!city.trim()) {
      toast.error('Please enter the city');
      return;
    }
    if (!pincode.trim()) {
      toast.error('Please enter the pincode');
      return;
    }
    
    setLoading(true);

    try {
      const calculatedEndDate = calculateEndDate(startDate, subscriptionDuration);
      
      await createSubscription.mutateAsync({
        customerId,
        productId,
        quantity,
        deliveryType: deliveryType as any,
        timeSlot,
        startDate: new Date(startDate),
        endDate: new Date(calculatedEndDate),
        address: { full_address: address, city, pincode, landmark },
        specialInstructions: specialInstructions || undefined,
        vacationFrom: vacationFrom ? new Date(vacationFrom) : undefined,
        vacationTo: vacationTo ? new Date(vacationTo) : undefined,
        source: 'seller_manual',
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
    setSubscriptionDuration('month');
    setShowNewCustomerForm(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
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
              {!showNewCustomerForm ? (
                <Select 
                  value={customerId} 
                  onValueChange={(val: string) => {
                    if (val === 'new_customer') {
                      setShowNewCustomerForm(true);
                    } else {
                      setCustomerId(val);
                    }
                  }} 
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_customer">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <Plus className="w-4 h-4" />
                        Add New Customer
                      </div>
                    </SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">New Customer Details</h4>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowNewCustomerForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Full Name *</Label>
                    <Input 
                      value={newCustomerName} 
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Phone Number *</Label>
                    <Input 
                      value={newCustomerPhone} 
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="Enter phone number"
                      type="tel"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Email (Optional)</Label>
                    <Input 
                      value={newCustomerEmail} 
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      placeholder="Enter email"
                      type="email"
                    />
                  </div>
                  
                  <Button 
                    type="button"
                    onClick={async () => {
                      const newUserId = await createNewCustomer();
                      if (newUserId) {
                        setCustomerId(newUserId);
                      }
                    }}
                    className="w-full"
                    size="sm"
                  >
                    Create Customer
                  </Button>
                </div>
              )}
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
              <Label>Subscription Duration *</Label>
              <Select value={subscriptionDuration} onValueChange={(val: 'week' | 'month' | '6months') => setSubscriptionDuration(val)} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">1 Week (4% discount)</SelectItem>
                  <SelectItem value="month">1 Month (7% discount)</SelectItem>
                  <SelectItem value="6months">6 Months (15% discount)</SelectItem>
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

          {productId && quantity > 0 && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50 space-y-3">
              <h3 className="font-semibold text-lg">Pricing Summary</h3>
              
              {(() => {
                const pricing = calculatePricing();
                return (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price per delivery:</span>
                        <span className="font-medium">₹{pricing.pricePerDelivery.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total deliveries ({subscriptionDuration === 'week' ? '1 week' : subscriptionDuration === 'month' ? '1 month' : '6 months'}):</span>
                        <span className="font-medium">{pricing.deliveryCount}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">₹{pricing.subtotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between text-green-600 dark:text-green-500">
                        <span>Discount ({pricing.discountPercentage}%):</span>
                        <span className="font-medium">-₹{pricing.discount.toFixed(2)}</span>
                      </div>
                      
                      <div className="border-t pt-2"></div>
                      
                      <div className="flex justify-between text-lg font-bold">
                        <span>Final Price:</span>
                        <span className="text-primary">₹{pricing.finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

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
