import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, MapPin, Clock, Phone, CalendarPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAgentCompensationDeliveries } from '@/hooks/useVacationCompensations';
import { format, parseISO } from 'date-fns';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: any;
  items: any;
  total: number;
  status: string;
  created_at: string;
  delivery_time_slot?: string;
  [key: string]: any; // Allow additional properties from Supabase
}

export default function DeliveryAgent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscription');

  // Fetch compensation deliveries assigned to this agent
  const { data: compensationDeliveries, isLoading: compensationsLoading } = useAgentCompensationDeliveries();

  const fetchPendingOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'packed')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const ordersData = (data || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : (order.items ? [order.items] : [])
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchPendingOrders();

    console.log('🚚 DeliveryAgent: Setting up real-time subscriptions');

    const ordersChannel = supabase
      .channel(`delivery-agent-orders-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🚚 DeliveryAgent: Order event received:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new.status === 'packed') {
            console.log('🚚 DeliveryAgent: Order packed - adding to list:', payload.new);
            
            const newOrder = {
              ...payload.new,
              items: Array.isArray(payload.new.items) ? payload.new.items : (payload.new.items ? [payload.new.items] : [])
            } as Order;
            
            setOrders(prev => {
              const exists = prev.find(order => order.id === newOrder.id);
              if (exists) {
                return prev.map(order => 
                  order.id === newOrder.id ? newOrder : order
                );
              }
              return [newOrder, ...prev];
            });

            console.log('🚚 Playing ringtone for new order');
            notificationSound.playNotificationSound('rapido_ringtone');
            
            toast({
              title: "🚚 New Delivery Available!",
              description: `Order from ${payload.new.customer_name} is ready for pickup`,
              duration: 8000,
              className: "bg-green-600 text-white border-green-600"
            });
          } 
          else if (payload.eventType === 'INSERT' && payload.new.status === 'packed') {
            const newOrder = {
              ...payload.new,
              items: Array.isArray(payload.new.items) ? payload.new.items : (payload.new.items ? [payload.new.items] : [])
            } as Order;
            
            setOrders(prev => {
              const exists = prev.find(order => order.id === newOrder.id);
              if (!exists) {
                return [newOrder, ...prev];
              }
              return prev;
            });
          }
          else if (payload.eventType === 'UPDATE' && payload.new.status !== 'packed') {
            setOrders(prev => prev.filter(order => order.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel(`agent-notifications-delivery-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_notifications'
        },
        (payload) => {
          const notification = payload.new;
          console.log('🚚 DeliveryAgent: Received notification:', notification);
          
          if (notification.type === 'new_delivery_assignment') {
            toast({
              title: notification.title,
              description: notification.message,
              duration: 8000,
              className: "bg-blue-600 text-white border-blue-600"
            });
            
            fetchPendingOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'assigned',
          agent_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Remove from local state
      setOrders(prev => prev.filter(order => order.id !== orderId));

      toast({
        title: "Order Accepted",
        description: "You have accepted this delivery",
        className: "bg-green-600 text-white border-green-600"
      });
    } catch (error) {
      console.error('Error accepting order:', error);
      toast({
        title: "Error",
        description: "Failed to accept order",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Delivery Partner Dashboard</h1>
            <p className="text-secondary">Available orders ready for pickup</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Subscription Deliveries
            {orders.length > 0 && (
              <Badge variant="secondary" className="ml-1">{orders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="compensation" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Extra Deliveries (Vacation)
            {compensationDeliveries && compensationDeliveries.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-800">{compensationDeliveries.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-6">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-secondary">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Subscription Orders Available</h3>
                  <p>All subscription orders have been assigned. Check back later for new deliveries.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Order #{order.id.slice(0, 8)}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            Subscription Delivery
                          </Badge>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Ready for Pickup
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer Info */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-primary">Customer Details</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-secondary" />
                              <span className="font-medium">{order.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-secondary" />
                              <span>{order.customer_phone}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-secondary mt-1" />
                              <span className="text-sm">
                                {order.address?.full_address || 'Address not available'}
                              </span>
                            </div>
                            {order.delivery_time_slot && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-secondary" />
                                <span className="text-sm">{order.delivery_time_slot}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Info */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-primary">Order Details</h4>
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="font-medium">Total: </span>
                              <span className="text-lg font-bold text-primary">₹{order.total}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Items: </span>
                              <span>{order.items?.length || 0} items</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Order Time: </span>
                              <span>{new Date(order.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="mt-6">
                        <h4 className="font-medium text-primary mb-3">Items to Deliver</h4>
                        <div className="bg-muted/50 rounded-lg p-4">
                          {Array.isArray(order.items) && order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                              <span className="text-sm font-medium">{item.name}</span>
                              <span className="text-sm text-secondary">
                                Qty: {item.quantity} × ₹{item.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-6 flex justify-end">
                        <Button 
                          onClick={() => handleAcceptOrder(order.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Accept Delivery
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compensation" className="mt-6">
          {compensationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !compensationDeliveries || compensationDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-secondary">
                  <CalendarPlus className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Extra Deliveries</h3>
                  <p>No vacation compensation deliveries assigned to you.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {compensationDeliveries.map((comp: any, index: number) => (
                <motion.div
                  key={comp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Extra Delivery #{comp.id.slice(0, 8)}
                        </CardTitle>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                          🏖️ Manual Extra Delivery (Vacation)
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer Info */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-primary">Customer Details</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-secondary" />
                              <span className="font-medium">{comp.customer?.full_name || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-secondary" />
                              <span>{comp.customer?.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-secondary mt-1" />
                              <span className="text-sm">
                                {comp.subscriptions?.delivery_address?.full_address || comp.customer?.address || 'Address not available'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Delivery Info */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-primary">Delivery Details</h4>
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="font-medium">Delivery Date: </span>
                              <span className="text-lg font-bold text-orange-600">
                                {format(parseISO(comp.compensation_delivery_date), 'EEE, MMM d, yyyy')}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Product: </span>
                              <span>{comp.subscriptions?.products?.name || 'Unknown'}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Quantity: </span>
                              <span>{comp.subscriptions?.quantity || 1}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Vacation Day: </span>
                              <span>{format(parseISO(comp.original_vacation_date), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}