import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSellerOrderActions } from '@/hooks/useSellerOrderActions';
import { LocationSetupModal } from '@/components/LocationSetupModal';
import { OrderAcceptanceTimer } from '@/components/OrderAcceptanceTimer';

const Orders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { acceptOrder, rejectOrder, packOrder, notifyDeliveryAgents, isProcessing } = useSellerOrderActions();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 10;

  const [searchParams] = useSearchParams();

  const orderTabs = [
    { value: 'all', label: 'All Orders', count: 0 },
    { value: 'to_accept', label: 'To Accept', count: 0 },
    { value: 'placed', label: 'Placed', count: 0 },
    { value: 'new', label: 'New', count: 0 },
    { value: 'accepted', label: 'Accepted', count: 0 },
    { value: 'in_transit', label: 'In Transit', count: 0 },
    { value: 'delivered', label: 'Delivered', count: 0 }
  ];

  useEffect(() => {
    if (user) {
      fetchOrders(0, true);
      setupRealtimeSubscription();
    }
  }, [user]);

  // Read URL filter parameter on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['all', 'to_accept', 'placed', 'new', 'accepted', 'in_transit', 'delivered'].includes(filterParam)) {
      setActiveTab(filterParam);
    }
  }, [searchParams]);

  // Reset and re-fetch when tab or search changes
  useEffect(() => {
    if (user) {
      setOffset(0);
      fetchOrders(0, true);
    }
  }, [activeTab, searchTerm]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('seller-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          // Re-fetch orders when any order changes to get updated seller data
          if (payload.eventType === 'INSERT') {
            // For new orders, check if they contain this seller's products
            fetchOrders();
            
            // Show notification if this order contains seller's products
            toast({
              title: "New Order Alert! 🔔",
              description: "Check if this order contains your products",
              duration: 5000
            });
          } else if (payload.eventType === 'UPDATE') {
            // Re-fetch to get updated order status
            fetchOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const mapOrder = (order: any) => ({
    id: order.order_id,
    total: order.seller_total,
    status: order.order_status,
    created_at: order.created_at,
    updated_at: order.updated_at,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    delivery_date: order.delivery_date,
    items: order.seller_items,
    address: order.address,
    payment_status: order.payment_status,
    agent_id: order.agent_id,
    user_id: user?.id
  });

  const fetchOrders = async (fromOffset: number = 0, reset: boolean = false) => {
    if (!user?.id) return;
    
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data, error } = await supabase
        .rpc('get_seller_specific_orders', { p_seller_user_id: user.id })
        .range(fromOffset, fromOffset + PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching seller orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch orders. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const mappedOrders = (data || []).map(mapOrder);

      if (reset) {
        setOrders(mappedOrders);
        setFilteredOrders(applyFilters(mappedOrders));
      } else {
        setOrders(prev => {
          const updated = [...prev, ...mappedOrders];
          setFilteredOrders(applyFilters(updated));
          return updated;
        });
      }

      setOffset(fromOffset + mappedOrders.length);
      setHasMore(mappedOrders.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const applyFilters = (orderList: any[]) => {
    let filtered = orderList;
    if (activeTab !== 'all') {
      if (activeTab === 'to_accept') {
        filtered = filtered.filter(o => ['placed', 'pending', 'new'].includes(o.status));
      } else if (activeTab === 'placed') {
        filtered = filtered.filter(o => o.status === 'placed');
      } else if (activeTab === 'new') {
        filtered = filtered.filter(o => o.status === 'new' || o.status === 'pending');
      } else {
        filtered = filtered.filter(o => o.status === activeTab);
      }
    }
    if (searchTerm) {
      filtered = filtered.filter(o =>
        o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_phone?.includes(searchTerm) ||
        o.id?.toString().includes(searchTerm)
      );
    }
    return filtered;
  };

  // Re-apply filters when searchTerm/activeTab changes on already-loaded orders
  useEffect(() => {
    setFilteredOrders(applyFilters(orders));
  }, [searchTerm, activeTab]);

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
      case 'pending':
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

  const getStatusBadge = (status: string, acceptanceWindowExpired?: boolean) => {
    const statusConfig = {
      pending: { label: 'New', variant: 'destructive' as const, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      pending_seller_acceptance: { label: 'Pending Acceptance', variant: 'default' as const, className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      pending_after_cutoff: { label: 'Requires Escalation', variant: 'destructive' as const, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      accepted_by_seller: { label: 'Accepted', variant: 'default' as const, className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      accepted_late: { label: 'Accepted (Late)', variant: 'default' as const, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
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
    count: tab.value === 'all' 
      ? orders.length 
      : tab.value === 'to_accept'
        ? orders.filter(order => ['placed', 'pending', 'new'].includes(order.status)).length
        : tab.value === 'placed'
          ? orders.filter(order => order.status === 'placed').length
          : tab.value === 'new'
            ? orders.filter(order => order.status === 'new' || order.status === 'pending').length
            : orders.filter(order => order.status === tab.value).length
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
          onClick={() => fetchOrders(0, true)} 
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

      {/* Status Filter Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-[200px] bg-zaago-card border-zaago-border text-foreground">
            <SelectValue>
              {tabCounts.find(t => t.value === activeTab)?.label} ({tabCounts.find(t => t.value === activeTab)?.count})
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-zaago-card border-zaago-border z-50">
            {tabCounts.map((tab) => (
              <SelectItem 
                key={tab.value} 
                value={tab.value}
                className="text-foreground hover:bg-zaago-accent focus:bg-zaago-accent cursor-pointer"
              >
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{tab.label}</span>
                  <span className="text-zaago-muted-foreground">{tab.count}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {tabCounts.find(t => t.value === activeTab)?.label} ({filteredOrders.length})
            </h2>
            {filteredOrders.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {Math.min(visibleCount, filteredOrders.length)} of {filteredOrders.length} orders
              </p>
            )}
          </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green"></div>
                </div>
              ) : filteredOrders.length > 0 ? (
                <>
                  <div className="grid gap-4">
                    {filteredOrders.slice(0, visibleCount).map((order) => (
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
                                  {getStatusBadge(order.status, order.acceptance_window_expired)}
                                  
                                  {/* Visibility Window Timer */}
                                  {order.visible_until && order.subscription_id && (
                                    <OrderAcceptanceTimer 
                                      visibleUntil={order.visible_until}
                                      isExpired={order.acceptance_window_expired || false}
                                    />
                                  )}
                                </div>
                                
                                {/* Timestamps */}
                                <div className="space-y-0.5">
                                  <p className="text-zaago-muted-foreground text-sm">
                                    Created: {new Date(order.created_at).toLocaleString('en-IN', {
                                      timeZone: 'Asia/Kolkata',
                                      dateStyle: 'medium',
                                      timeStyle: 'short'
                                    })}
                                  </p>
                                  
                                  {order.seller_accepted_at && (
                                    <p className="text-green-400 text-sm">
                                      Accepted: {new Date(order.seller_accepted_at).toLocaleString('en-IN', {
                                        timeZone: 'Asia/Kolkata',
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                      })}
                                    </p>
                                  )}
                                  
                                  {order.visible_until && !order.seller_accepted_at && (
                                    <p className={`text-sm ${order.acceptance_window_expired ? 'text-red-400' : 'text-orange-400'}`}>
                                      Deadline: {new Date(order.visible_until).toLocaleString('en-IN', {
                                        timeZone: 'Asia/Kolkata',
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                      })}
                                    </p>
                                  )}
                                </div>
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

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
                              {/* Seller Action Buttons */}
                              {(order.status === 'new' || order.status === 'pending' || order.status === 'placed') && (
                                <>
                                  <Button
                                    onClick={() => acceptOrder(order.id, user?.id || '')}
                                    disabled={isProcessing === order.id}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                                  >
                                    <CheckSquare className="w-4 h-4" />
                                    Accept Order
                                  </Button>
                                  <Button
                                    onClick={() => rejectOrder(order.id, user?.id || '')}
                                    disabled={isProcessing === order.id}
                                    variant="destructive"
                                    size="sm"
                                    className="flex items-center gap-2"
                                  >
                                    <XSquare className="w-4 h-4" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              
                              {(order.status === 'accepted' || order.status === 'accepted_by_seller' || order.status === 'accepted_late') && (
                                <Button
                                  onClick={async () => {
                                    const success = await packOrder(order.id, user?.id || '');
                                    if (!success) {
                                      setShowLocationModal(true);
                                    }
                                  }}
                                  disabled={isProcessing === order.id}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                                >
                                  <Package className="w-4 h-4" />
                                  Mark as Packed
                                </Button>
                              )}

                              {order.status === 'packed' && (
                                <Button
                                  onClick={() => notifyDeliveryAgents(order.id, user?.id || '')}
                                  disabled={isProcessing === order.id}
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                                >
                                  <Truck className="w-4 h-4" />
                                  Notify Delivery Partners
                                </Button>
                              )}
                              
                              {/* View Details Button - Always available */}
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

                  {/* View More / View Less */}
                  {filteredOrders.length > visibleCount && (
                    <div className="flex flex-col items-center gap-2 pt-2">
                      {visibleCount < filteredOrders.length ? (
                        <Button
                          variant="outline"
                          onClick={() => setVisibleCount(prev => prev + 5)}
                          className="border-zaago-border text-foreground hover:bg-zaago-accent hover:border-primary transition-all"
                        >
                          View More ({filteredOrders.length - visibleCount} remaining)
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setVisibleCount(5)}
                          className="border-zaago-border text-muted-foreground hover:bg-zaago-accent transition-all"
                        >
                          View Less
                        </Button>
                      )}
                    </div>
                  )}
                </>
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
      </motion.div>

      {/* Location Setup Modal */}
      <LocationSetupModal
        open={showLocationModal}
        onOpenChange={setShowLocationModal}
        onLocationSet={() => {
          toast({
            title: "Location Set Successfully",
            description: "You can now mark orders as packed!",
          });
        }}
      />
    </motion.div>
  );
};

export default Orders;