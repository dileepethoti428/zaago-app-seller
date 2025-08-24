import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Filter,
  Eye,
  CheckSquare,
  XSquare,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Orders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  const orderTabs = [
    { value: 'all', label: 'All Orders', count: 0 },
    { value: 'new', label: 'New', count: 0 },
    { value: 'accepted', label: 'Accepted', count: 0 },
    { value: 'in_transit', label: 'In Transit', count: 0 },
    { value: 'delivered', label: 'Delivered', count: 0 }
  ];

  useEffect(() => {
    if (user) {
      fetchOrders();
      setupRealtimeSubscription();
    }
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, activeTab]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            setOrders(prev => [newOrder, ...prev]);
            
            toast({
              title: "New Order Received! 🎉",
              description: `Order #${newOrder.id.toString().slice(0, 8)} from ${newOrder.customer_name || 'Customer'}`,
              duration: 5000
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            setOrders(prev => 
              prev.map(order => 
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at, customer_name, customer_phone, delivery_date, items, address, payment_status, agent_id, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch orders. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => order.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone?.includes(searchTerm) ||
        order.id.toString().includes(searchTerm)
      );
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (processingOrder) return;
    
    setProcessingOrder(orderId);
    
    try {
      // Optimistic update
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus.replace('_', ' ')}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating order:', error);
      
      // Revert optimistic update
      await fetchOrders();
      
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'new':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'rejected':
        return <XSquare className="w-4 h-4 text-red-500" />;
      case 'assigned':
      case 'out_for_delivery':
      case 'in_transit':
        return <Truck className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-secondary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { label: 'New', variant: 'destructive' as const, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      accepted: { label: 'Accepted', variant: 'default' as const, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      rejected: { label: 'Rejected', variant: 'destructive' as const, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      assigned: { label: 'Assigned', variant: 'outline' as const, className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      out_for_delivery: { label: 'Out for Delivery', variant: 'outline' as const, className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      in_transit: { label: 'In Transit', variant: 'outline' as const, className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      delivered: { label: 'Delivered', variant: 'default' as const, className: 'bg-primary/20 text-primary border-primary/30' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'secondary' as const, className: '' };

    return (
      <Badge className={`capitalize shadow-glow ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const getItemsCount = (items: any[]) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  // Calculate tab counts
  const tabCounts = orderTabs.map(tab => ({
    ...tab,
    count: tab.value === 'all' ? orders.length : orders.filter(order => order.status === tab.value).length
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zaago-green mb-2">
            Orders Management
          </h1>
          <p className="text-zaago-green-light text-sm sm:text-base">
            Manage orders with real-time updates and status tracking
          </p>
        </div>
        
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <Card className="zaago-card">
          <CardContent className="p-4 sm:p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
              <Input
                placeholder="Search by customer name, phone, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-card border border-border">
            {tabCounts.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="font-medium text-xs sm:text-sm">{tab.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {tab.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card className="zaago-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {activeTab === 'all' ? 'All' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('_', ' ')} Orders ({filteredOrders.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredOrders.length > 0 ? (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(order.status)}
                              <h3 className="font-semibold text-foreground">
                                Order #{order.id.toString().slice(0, 8)}
                              </h3>
                              {getStatusBadge(order.status)}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-secondary">Customer</p>
                                <p className="text-foreground font-medium">
                                  {order.customer_name || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-secondary">Items</p>
                                <p className="text-foreground font-medium">
                                  {getItemsCount(order.items)} items
                                </p>
                              </div>
                              <div>
                                <p className="text-secondary">Total</p>
                                <p className="text-foreground font-medium">
                                  ₹{order.total}
                                </p>
                              </div>
                              <div>
                                <p className="text-secondary">Date</p>
                                <p className="text-foreground font-medium">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                            {order.status === 'new' && (
                              <>
                                <Button
                                  onClick={() => updateOrderStatus(order.id, 'accepted')}
                                  disabled={processingOrder === order.id}
                                  size="sm"
                                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                                >
                                  <CheckSquare className="w-4 h-4 mr-2" />
                                  Accept
                                </Button>
                                <Button
                                  onClick={() => updateOrderStatus(order.id, 'rejected')}
                                  disabled={processingOrder === order.id}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                                >
                                  <XSquare className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            )}
                            
                            {order.status === 'accepted' && (
                              <Button
                                onClick={() => updateOrderStatus(order.id, 'in_transit')}
                                disabled={processingOrder === order.id}
                                size="sm"
                                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
                              >
                                <Truck className="w-4 h-4 mr-2" />
                                Mark In Transit
                              </Button>
                            )}
                            
                            {order.status === 'in_transit' && (
                              <Button
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                disabled={processingOrder === order.id}
                                size="sm"
                                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark Delivered
                              </Button>
                            )}
                            
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/orders/${order.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-secondary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No orders found
                    </h3>
                    <p className="text-secondary text-sm">
                      {searchTerm || activeTab !== 'all' 
                        ? 'Try adjusting your filters' 
                        : 'Orders will appear here when customers place them'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default Orders;