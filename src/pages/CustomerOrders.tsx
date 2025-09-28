import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Package, CheckCircle, Truck, MapPin, Search, RefreshCw, Eye, Phone, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSellerOrderActions } from '@/hooks/useSellerOrderActions';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { LocationSetupModal } from '@/components/LocationSetupModal';

interface Order {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  total_amount: number;
  items: any[];
  product_statuses?: any;
  order_type: string;
  seller_total?: number;
  seller_items?: number;
}

const CustomerOrders: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { acceptOrder, rejectOrder, packOrder, isProcessing } = useSellerOrderActions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const orderTabs = [
    { label: 'All Orders', value: 'all' },
    { label: 'New Orders', value: 'new' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Delivered', value: 'delivered' }
  ];

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
      const subscription = setupRealtimeSubscription();
      
      return () => {
        subscription?.unsubscribe?.();
      };
    }
  }, [user?.id]);

  const setupRealtimeSubscription = () => {
    return supabase
      .channel('seller-orders-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, 
        (payload) => {
          console.log('Real-time order update:', payload);
          fetchOrders();
        }
      )
      .subscribe();
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      console.log('Fetching orders for seller:', user.id);
      
      const { data, error } = await supabase
        .rpc('get_seller_specific_orders', { 
          p_seller_user_id: user.id 
        });
      
      if (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch orders. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched orders data:', data);
      
      if (!data) {
        console.log('No data returned from RPC function');
        setOrders([]);
        return;
      }

      // Map the RPC response to our Order interface
      const mappedOrders = (data || []).map((order: any) => ({
        id: order.order_id,
        status: order.order_status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        delivery_address: order.address,
        total_amount: order.seller_total,
        items: order.seller_items,
        product_statuses: {},
        order_type: 'delivery',
        seller_total: order.seller_total,
        seller_items: Array.isArray(order.seller_items) ? order.seller_items.length : 0
      }));

      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error in fetchOrders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  // Pack order function - now handled by useSellerOrderActions hook
  const handlePackOrder = async (orderId: string, sellerId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('address')
      .eq('id', sellerId)
      .single();

    if (!profile?.address) {
      setIsLocationModalOpen(true);
      return;
    }

    await packOrder(orderId, sellerId);
    fetchOrders();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'new':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'packed':
        return <Package className="w-5 h-5 text-purple-400" />;
      case 'assigned':
      case 'in_transit':
      case 'out_for_delivery':
        return <Truck className="w-5 h-5 text-blue-400" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
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

  // Calculate tab counts
  const tabCounts = orderTabs.map(tab => ({
    ...tab,
    count: tab.value === 'all' ? orders.length : orders.filter(order => order.status === tab.value).length
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Seller Orders
          </h1>
          <p className="text-zaago-muted-foreground text-sm sm:text-base">
            Manage orders containing your products
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
          placeholder="Search orders by ID, customer name, or status..."
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

                        {/* Customer Info */}
                        <div className="flex items-center justify-between bg-zaago-card/30 rounded-lg p-4">
                          <div>
                            <p className="font-medium text-foreground">
                              Customer: {order.customer_name}
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
                          <div className="text-right">
                            <p className="font-semibold text-foreground text-lg">
                              ₹{(order.seller_total || 0).toFixed(2)}
                            </p>
                            <p className="text-zaago-muted-foreground text-sm">
                              {order.seller_items || 0} items
                            </p>
                          </div>
                        </div>

                        {/* Products from this seller */}
                        {order.items && order.items.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-foreground">Your Products in this Order:</h4>
                            <div className="space-y-2">
                              {order.items.filter((item: any) => item.seller_id === user?.id).map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between bg-zaago-card/20 rounded-lg p-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-zaago-card rounded-lg flex items-center justify-center">
                                      <Package className="w-6 h-6 text-zaago-muted-foreground" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground">{item.product_name}</p>
                                      <p className="text-zaago-muted-foreground text-sm">
                                        Qty: {item.quantity} × ₹{item.price?.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <p className="font-semibold text-foreground">
                                      ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                                    </p>
                                    {(() => {
                                      const productStatus = order.product_statuses?.[item.id]?.status || 'pending';
                                      
                                      if (productStatus === 'accepted') {
                                        return (
                                          <div className="ml-4">
                                            <Badge className="bg-zaago-green/20 text-zaago-green border-zaago-green/30">
                                              ✅ Accepted
                                            </Badge>
                                          </div>
                                        );
                                      } else if (productStatus === 'rejected') {
                                        return (
                                          <div className="ml-4">
                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                              ❌ Rejected
                                            </Badge>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Individual Product Actions for New Orders */}
                        {(() => {
                          const sellerItems = order.items?.filter((item: any) => item.seller_id === user?.id) || [];
                          const currentOrderStatus = order.status;
                          
                          // Show individual product accept/reject buttons for new orders
                          if (['new', 'pending'].includes(currentOrderStatus) && sellerItems.length > 0) {
                            return (
                              <div className="space-y-3 pt-3 border-t border-zaago-border/30 mt-3">
                                <h5 className="font-medium text-foreground">Action Required for Your Products:</h5>
                                {sellerItems.map((item: any) => {
                                  const productStatus = order.product_statuses?.[item.id]?.status || 'pending';
                                  
                                  return (
                                    <div key={item.id} className="flex items-center justify-between bg-zaago-card/30 rounded-lg p-3">
                                      <div>
                                        <p className="font-medium text-foreground">{item.product_name}</p>
                                        <p className="text-zaago-muted-foreground text-sm">
                                          Qty: {item.quantity} × ₹{item.price?.toFixed(2)}
                                        </p>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        {productStatus === 'pending' && (
                                          <>
                                            <Button
                                              onClick={() => acceptOrder(order.id, user?.id || "")}
                                              disabled={isProcessing === order.id}
                                              className="bg-zaago-green text-black hover:bg-zaago-green/90 flex items-center gap-2"
                                              size="sm"
                                            >
                                              {isProcessing === order.id ? (
                                                <>
                                                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                                  Accepting...
                                                </>
                                              ) : (
                                                <>
                                                  <CheckCircle className="w-4 h-4" />
                                                  Accept
                                                </>
                                              )}
                                            </Button>
                                            <Button
                                              onClick={() => rejectOrder(order.id, user?.id || "")}
                                              disabled={isProcessing === order.id}
                                              variant="destructive"
                                              className="flex items-center gap-2"
                                              size="sm"
                                            >
                                              {isProcessing === order.id ? (
                                                <>
                                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                                  Rejecting...
                                                </>
                                              ) : (
                                                <>
                                                  <X className="w-4 h-4" />
                                                  Reject
                                                </>
                                              )}
                                            </Button>
                                          </>
                                        )}
                                        
                                        {productStatus === 'accepted' && (
                                          <Badge className="bg-zaago-green/20 text-zaago-green border-zaago-green/30">
                                            ✅ Accepted
                                          </Badge>
                                        )}
                                        
                                        {productStatus === 'rejected' && (
                                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                            ❌ Rejected
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                          
                          // Show pack button for accepted orders
                          const shouldShowPackButton = sellerItems.length > 0 && ['accepted', 'confirmed'].includes(currentOrderStatus);
                          
                          return (
                            <div className="flex gap-2 pt-3 border-t border-zaago-border/30 mt-3">
                              {shouldShowPackButton && (
                                <Button
                                  onClick={() => handlePackOrder(order.id, user?.id || "")}
                                  disabled={isProcessing === order.id}
                                  className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                                >
                                  {isProcessing === order.id ? (
                                    <>
                                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                                      Packing...
                                    </>
                                  ) : (
                                    <>
                                      <Package className="w-4 h-4" />
                                      Mark as Packed
                                    </>
                                  )}
                                </Button>
                              )}
                               
                               {/* View Details button for packed/delivered orders */}
                               {['packed', 'in_transit', 'delivered'].includes(currentOrderStatus) && (
                                <Link to={`/orders/${order.id}`} className="flex-1">
                                  <Button
                                    variant="outline"
                                    className="w-full border-zaago-border text-zaago-muted-foreground hover:bg-zaago-accent/50 hover:text-foreground hover:border-zaago-green transition-all duration-200 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </Button>
                                </Link>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-zaago-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Orders Found</h3>
                  <p className="text-zaago-muted-foreground mb-6">
                    {activeTab === 'all' 
                      ? "You don't have any orders containing your products yet. Once customers start purchasing your products, their orders will appear here."
                      : `No ${activeTab} orders found.`
                    }
                  </p>
                  <div className="space-y-2 text-sm text-zaago-muted-foreground">
                    <p>💡 To start receiving orders:</p>
                    <p>1. Add products to your store</p>
                    <p>2. Set competitive prices</p>
                    <p>3. Wait for customers to place orders</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <LocationSetupModal 
        open={isLocationModalOpen} 
        onOpenChange={setIsLocationModalOpen}
      />
    </div>
  );
};

export default CustomerOrders;