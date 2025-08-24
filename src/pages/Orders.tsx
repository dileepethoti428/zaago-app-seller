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
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Orders Management
          </h1>
          <p className="text-zaago-muted-foreground text-sm sm:text-base">
            Manage orders with real-time updates and status tracking
          </p>
        </div>
        
        <Button 
          onClick={fetchOrders} 
          disabled={loading}
          className="bg-transparent border border-zaago-border text-foreground hover:bg-zaago-accent flex items-center gap-2"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zaago-muted-foreground w-5 h-5" />
        <Input
          placeholder="Search by customer name, phone, or order ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-3 bg-zaago-card/50 border-zaago-border text-foreground placeholder:text-zaago-muted-foreground focus:border-zaago-green focus:ring-zaago-green"
        />
      </motion.div>

      {/* Status Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 bg-transparent gap-1">
            {tabCounts.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.value
                    ? 'bg-zaago-green text-black font-medium'
                    : 'bg-zaago-card/50 text-zaago-muted-foreground hover:bg-zaago-accent/50'
                }`}
              >
                <span className="font-medium text-sm">
                  {tab.value === 'all' ? 'All Orders' : 
                   tab.value === 'new' ? 'New' :
                   tab.value === 'accepted' ? 'Accepted' :
                   tab.value === 'in_transit' ? 'In Transit' :
                   'Delivered'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.value
                    ? 'bg-black/20 text-black'
                    : 'bg-zaago-muted text-zaago-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">
                All Orders ({filteredOrders.length})
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green"></div>
                </div>
              ) : filteredOrders.length > 0 ? (
                <div className="grid gap-4">
                  {filteredOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zaago-card/50 border border-zaago-border rounded-xl p-6 hover:bg-zaago-accent/30 transition-all duration-200"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Order Header */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(order.status)}
                            <div className="flex flex-col">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-foreground text-lg">
                                  Order #{order.id.toString().slice(0, 8)}
                                </h3>
                                <Badge 
                                  className={`${
                                    order.status === 'delivered' 
                                      ? 'bg-zaago-green/20 text-zaago-green border-zaago-green/30' 
                                      : order.status === 'new' || order.status === 'accepted'
                                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                      : order.status === 'in_transit'
                                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      : 'bg-zaago-muted/20 text-zaago-muted-foreground border-zaago-muted/30'
                                  } text-sm font-medium px-3 py-1`}
                                >
                                  {order.status === 'in_transit' ? 'In Transit' : 
                                   order.status === 'new' ? 'New' :
                                   order.status === 'accepted' ? 'Accepted' :
                                   order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-zaago-muted-foreground text-sm">
                                {new Date(order.created_at).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Order Details */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6 lg:gap-8">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 lg:gap-8">
                            <div className="text-center sm:text-left">
                              <p className="text-zaago-muted-foreground text-sm mb-1">Customer</p>
                              <p className="text-foreground font-semibold text-base">
                                {order.customer_name || 'Customer'}
                              </p>
                            </div>
                            <div className="text-center sm:text-left">
                              <p className="text-zaago-muted-foreground text-sm mb-1">Items</p>
                              <p className="text-foreground font-semibold text-base">
                                {getItemsCount(order.items)} items
                              </p>
                            </div>
                            <div className="text-center sm:text-left">
                              <p className="text-zaago-muted-foreground text-sm mb-1">Total</p>
                              <p className="text-zaago-green font-bold text-lg">₹{order.total}</p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex justify-center sm:justify-end">
                            <Link to={`/orders/${order.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto border-zaago-border text-zaago-muted-foreground hover:bg-zaago-accent hover:text-foreground hover:border-zaago-green transition-all duration-200 flex items-center gap-2 px-4 py-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-zaago-muted mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-zaago-muted-foreground mb-2">No orders found</h3>
                  <p className="text-zaago-muted-foreground">
                    {activeTab === 'all' 
                      ? "You don't have any orders yet." 
                      : `No ${activeTab} orders found.`}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default Orders;