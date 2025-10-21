import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell } from 'lucide-react';

interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
  user_id: string;
}

export const TestOrderNotification = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingOrders, setFetchingOrders] = useState(true);
  const { toast } = useToast();
  
  const testStatuses = [
    { value: 'placed', label: 'Order Placed' },
    { value: 'accepted', label: 'Order Accepted' },
    { value: 'confirmed', label: 'Order Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'packed', label: 'Packed' },
    { value: 'assigned', label: 'Agent Assigned' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
  
  useEffect(() => {
    fetchRecentOrders();
  }, []);
  
  const fetchRecentOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, status, total, user_id')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setFetchingOrders(false);
    }
  };
  
  const handleTestNotification = async () => {
    if (!selectedOrderId || !selectedStatus) {
      toast({
        title: 'Missing Information',
        description: 'Please select both an order and a status',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Get the order to find the user_id
      const selectedOrder = orders.find(o => o.id === selectedOrderId);
      
      if (!selectedOrder) {
        throw new Error('Order not found');
      }
      
      // Call the edge function directly
      const { data, error } = await supabase.functions.invoke('send-order-notification', {
        body: {
          orderId: selectedOrderId,
          status: selectedStatus,
          userId: selectedOrder.user_id,
        },
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Test Notification Sent!',
        description: `Notification sent for order ${selectedOrderId.slice(0, 8)}... with status: ${selectedStatus}`,
      });
      
      console.log('Test notification response:', data);
      
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Test Order Notification
        </CardTitle>
        <CardDescription>
          Send a test push notification for an order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Order</label>
          {fetchingOrders ? (
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders found</p>
          ) : (
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an order" />
              </SelectTrigger>
              <SelectContent>
                {orders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    Order {order.id.slice(0, 8)}... - ₹{order.total} ({order.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {testStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleTestNotification} 
          disabled={loading || !selectedOrderId || !selectedStatus || fetchingOrders}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Send Test Notification'}
        </Button>
      </CardContent>
    </Card>
  );
};
