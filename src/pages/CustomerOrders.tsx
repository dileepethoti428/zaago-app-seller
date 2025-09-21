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
  Eye,
  RefreshCw,
  User,
  MapPin,
  Check,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSellerOrderActions } from '@/hooks/useSellerOrderActions';

const CustomerOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { acceptOrder, rejectOrder, packOrder, isProcessing } = useSellerOrderActions();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const orderTabs = [
    { value: 'all', label: 'All', count: 0 },
    { value: 'ongoing', label: 'Ongoing', count: 0 },
    { value: 'delivered', label: 'Delivered', count: 0 }
  ];

  useEffect(() => {
    if (user) {
      fetchCustomerOrders();
      setupRealtimeSubscription();
    }
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, activeTab]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('customer-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Customer order realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            setOrders(prev => [newOrder, ...prev]);
            
            toast({
              title: "Order Placed Successfully! 🎉",
              description: `Order #${newOrder.id.toString().slice(0, 8)} has been placed`,
              duration: 5000
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            setOrders(prev => 
              prev.map(order => 
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
            
            // Show notification for status changes
            if (updatedOrder.status === 'accepted') {
              toast({
                title: "Order Accepted! ✅",
                description: `Order #${updatedOrder.id.toString().slice(0, 8)} has been accepted by the seller`,
                duration: 5000
              });
            } else if (updatedOrder.status === 'packed') {
              toast({
                title: "Order Packed! 📦",
                description: `Order #${updatedOrder.id.toString().slice(0, 8)} is packed and ready for delivery`,
                duration: 5000
              });
            } else if (updatedOrder.status === 'delivered') {
              toast({
                title: "Order Delivered! 🚛",
                description: `Order #${updatedOrder.id.toString().slice(0, 8)} has been delivered`,
                duration: 5000
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchCustomerOrders = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch all orders for comprehensive order management
      const { data, error } = await supabase
        .from('orders')
        .select('*')
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

    // Filter by tab with customer-friendly categories
    if (activeTab === 'ongoing') {
      // Ongoing orders: everything except delivered and rejected
      filtered = filtered.filter(order => 
        !['delivered', 'rejected', 'cancelled'].includes(order.status)
      );
    } else if (activeTab === 'delivered') {
      filtered = filtered.filter(order => order.status === 'delivered');
    }
    // 'all' shows everything

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toString().includes(searchTerm) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone?.includes(searchTerm)
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'pending':
      case 'new':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'accepted':
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case 'packed':
        return <Package className="w-5 h-5 text-purple-500" />;
      case 'in_transit':
      case 'assigned':
      case 'out_for_delivery':
        return <Truck className="w-5 h-5 text-blue-500" />;
      case 'rejected':
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCustomerFriendlyStatus = (status: string) => {
    switch (status) {
      case 'pending':
      case 'new':
        return 'Order Placed';
      case 'accepted':
        return 'Order Confirmed';
      case 'packed':
        return 'Preparing Your Order';
      case 'assigned':
        return 'Out for Delivery';
      case 'in_transit':
      case 'out_for_delivery':
        return 'On the Way';
      case 'delivered':
        return 'Delivered';
      case 'rejected':
        return 'Order Cancelled';
      case 'cancelled':
        return 'Order Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Order Placed', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      new: { label: 'Order Placed', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      accepted: { label: 'Confirmed', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      rejected: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      packed: { label: 'Preparing', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      assigned: { label: 'Out for Delivery', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      out_for_delivery: { label: 'On the Way', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      in_transit: { label: 'On the Way', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      delivered: { label: 'Delivered', className: 'bg-green-500/20 text-green-400 border-green-500/30' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };

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

  // Calculate tab counts with customer-friendly categories
  const tabCounts = orderTabs.map(tab => {
    if (tab.value === 'all') {
      return { ...tab, count: orders.length };
    } else if (tab.value === 'ongoing') {
      return { 
        ...tab, 
        count: orders.filter(order => !['delivered', 'rejected', 'cancelled'].includes(order.status)).length 
      };
    } else if (tab.value === 'delivered') {
      return { ...tab, count: orders.filter(order => order.status === 'delivered').length };
    }
    return tab;
  });

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
            Manage customer orders and delivery assignments
          </p>
        </div>
        
        <Button 
          onClick={fetchCustomerOrders} 
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
          placeholder="Search by order ID or items..."
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
          <TabsList className="grid grid-cols-3 bg-transparent gap-1 w-full max-w-md mx-auto">
            {tabCounts.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.value
                    ? 'bg-zaago-green text-black font-medium'
                    : 'bg-zaago-card/50 text-zaago-muted-foreground hover:bg-zaago-accent/50'
                }`}
              >
                <span className="font-medium text-sm">
                  {tab.label}
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
                {activeTab === 'all' ? 'All Orders' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Orders`} ({filteredOrders.length})
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
                      className="bg-zaago-card/50 border border-zaago-border rounded-xl p-6 hover:bg-zaago-accent/20 transition-all duration-200"
                    >
                      <div className="flex flex-col gap-4">
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(order.status)}
                            <div>
                              <h3 className="font-semibold text-foreground text-lg">
                                Order #{order.id.toString().slice(0, 8)}
                              </h3>
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
                          {getStatusBadge(order.status)}
                        </div>

                        {/* Order Progress */}
                        <div className="bg-zaago-card/30 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(order.status)}
                            <div>
                              <p className="font-medium text-foreground">
                                {getCustomerFriendlyStatus(order.status)}
                              </p>
                              <p className="text-zaago-muted-foreground text-sm">
                                {order.status === 'delivered' 
                                  ? `Delivered at ${new Date(order.updated_at || order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                                  : order.status === 'packed'
                                  ? 'Your order is being prepared'
                                  : order.status === 'accepted'
                                  ? 'Restaurant is preparing your order'
                                  : order.status === 'in_transit' || order.status === 'assigned'
                                  ? 'Your order is on the way'
                                  : 'Your order has been placed'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Order Items Preview */}
                        <div className="border-t border-zaago-border pt-4">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-zaago-muted-foreground text-sm">
                              {getItemsCount(order.items)} item{getItemsCount(order.items) !== 1 ? 's' : ''}
                            </p>
                            <p className="text-zaago-green font-bold text-xl">₹{order.total}</p>
                          </div>
                          
                          {/* Show first few items */}
                          {order.items && Array.isArray(order.items) && (
                            <div className="space-y-1">
                              {order.items.slice(0, 2).map((item: any, index: number) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-foreground">{item.name} x {item.quantity}</span>
                                  <span className="text-zaago-muted-foreground">₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <p className="text-zaago-muted-foreground text-sm">
                                  +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Link to={`/orders/${order.id}`} className="flex-1">
                            <Button
                              variant="outline"
                              className="w-full border-zaago-border text-zaago-muted-foreground hover:bg-zaago-accent/50 hover:text-foreground hover:border-zaago-green transition-all duration-200 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </Link>
                          
                          {/* Seller Actions */}
                          {['new', 'pending'].includes(order.status) && (
                            <>
                              <Button
                                onClick={() => acceptOrder(order.id, user?.id || '')}
                                disabled={isProcessing === order.id}
                                className="bg-zaago-green text-black hover:bg-zaago-green/90 transition-all duration-200 flex items-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                Accept
                              </Button>
                              <Button
                                onClick={() => rejectOrder(order.id, user?.id || '')}
                                disabled={isProcessing === order.id}
                                variant="outline"
                                className="border-red-500 text-red-400 hover:bg-red-500/10 transition-all duration-200 flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {order.status === 'accepted' && (
                            <Button
                              onClick={() => packOrder(order.id, user?.id || '')}
                              disabled={isProcessing === order.id}
                              className="bg-purple-500 text-white hover:bg-purple-600 transition-all duration-200 flex items-center gap-2"
                            >
                              <Package className="w-4 h-4" />
                              Pack Order
                            </Button>
                          )}
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
                      ? "You haven't placed any orders yet." 
                      : activeTab === 'ongoing'
                      ? "No ongoing orders at the moment."
                      : "No delivered orders found."}
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

export default CustomerOrders;