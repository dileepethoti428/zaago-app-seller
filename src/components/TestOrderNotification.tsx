import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell } from 'lucide-react';

export const TestOrderNotification = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
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
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', selectedOrderId)
        .single();
        
      if (orderError || !order) {
        throw new Error('Order not found');
      }
      
      // Call the edge function directly
      const { data, error } = await supabase.functions.invoke('send-order-notification', {
        body: {
          orderId: selectedOrderId,
          status: selectedStatus,
          userId: order.user_id,
        },
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Test Notification Sent!',
        description: `Notification sent for order ${selectedOrderId.slice(0, 8)}`,
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
          <label className="text-sm font-medium">Order ID</label>
          <input
            type="text"
            placeholder="Enter order UUID"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
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
          disabled={loading || !selectedOrderId || !selectedStatus}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Send Test Notification'}
        </Button>
      </CardContent>
    </Card>
  );
};
