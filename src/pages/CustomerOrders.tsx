import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Package, CheckCircle, Truck, MapPin, Search, RefreshCw, Eye, Phone, X, Filter, Calendar, DollarSign } from 'lucide-react';
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
  order_type: string;
  seller_total?: number;
  seller_items?: number;
  payment_status?: string;
}

const CustomerOrders: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { acceptOrder, rejectOrder, packOrder, notifyDeliveryAgents, isProcessing } = useSellerOrderActions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');


  useEffect(() => {
    if (!user?.id) {
      console.warn('CustomerOrders: No user ID available');
      setLoading(false);
      return;
    }

    fetchOrders();
    const subscription = setupRealtimeSubscription();
    
    return () => {
      subscription?.unsubscribe?.();
    };
  }, [user?.id]);

  const setupRealtimeSubscription = () => {
    if (!user?.id) return null;
    
    return supabase
      .channel('seller-orders-channel')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders'
        }, 
        (payload) => {
          console.log('Real-time order update:', payload);
          // Only refetch if this order contains seller's products
          // The RPC function will filter appropriately
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

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = searchTerm === '' || 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      // Date filter
      const orderDate = new Date(order.created_at);
      const now = new Date();
      let matchesDate = true;
      
      if (dateFilter === 'today') {
        matchesDate = orderDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        matchesDate = orderDate >= monthAgo;
      } else if (dateFilter === 'year') {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        matchesDate = orderDate >= yearAgo;
      }
      
      // Amount filter
      let matchesAmount = true;
      if (amountFilter === 'low') {
        matchesAmount = order.total_amount < 500;
      } else if (amountFilter === 'medium') {
        matchesAmount = order.total_amount >= 500 && order.total_amount <= 2000;
      } else if (amountFilter === 'high') {
        matchesAmount = order.total_amount > 2000;
      }
      
      return matchesSearch && matchesStatus && matchesDate && matchesAmount;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'amount_high') {
        return b.total_amount - a.total_amount;
      } else if (sortBy === 'amount_low') {
        return a.total_amount - b.total_amount;
      }
      return 0;
    });

  // Calculate counts for each status (with fallback for empty orders)
  const orderCounts = {
    all: orders?.length || 0,
    new: orders?.filter(o => o.status === 'new' || o.status === 'pending')?.length || 0,
    accepted: orders?.filter(o => o.status === 'accepted')?.length || 0,
    in_transit: orders?.filter(o => o.status === 'in_transit')?.length || 0,
    delivered: orders?.filter(o => o.status === 'delivered')?.length || 0,
  };

  const handleAcceptOrder = async (orderId: string, sellerId: string) => {
    const success = await acceptOrder(orderId, sellerId);
    if (success) {
      fetchOrders();
    }
  };

  const handleRejectOrder = async (orderId: string, sellerId: string) => {
    const success = await rejectOrder(orderId, sellerId);
    if (success) {
      fetchOrders();
    }
  };

  const handlePackOrder = async (orderId: string, sellerId: string) => {
    const success = await packOrder(orderId, sellerId);
    if (success) {
      fetchOrders();
    }
  };

  const handleNotifyAgents = async (orderId: string, sellerId: string) => {
    const success = await notifyDeliveryAgents(orderId, sellerId);
    if (success) {
      fetchOrders();
    }
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
        
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                className="bg-transparent border border-zaago-border text-foreground hover:bg-zaago-accent flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-zaago-card border-zaago-border">
              <DropdownMenuLabel className="text-foreground">Filter Orders</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zaago-border" />
              
              {/* Order Status Filter */}
              <div className="p-2">
                <label className="text-xs font-medium text-zaago-muted-foreground mb-1 block">Order Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 bg-zaago-background border-zaago-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zaago-card border-zaago-border">
                    <SelectItem value="all">All Orders ({orderCounts.all})</SelectItem>
                    <SelectItem value="new">New Orders ({orderCounts.new})</SelectItem>
                    <SelectItem value="accepted">Accepted ({orderCounts.accepted})</SelectItem>
                    <SelectItem value="in_transit">In Transit ({orderCounts.in_transit})</SelectItem>
                    <SelectItem value="delivered">Delivered ({orderCounts.delivered})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-2">
                <label className="text-xs font-medium text-zaago-muted-foreground mb-1 block">Date Range</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-8 bg-zaago-background border-zaago-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zaago-card border-zaago-border">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Filter */}
              <div className="p-2">
                <label className="text-xs font-medium text-zaago-muted-foreground mb-1 block">Order Amount</label>
                <Select value={amountFilter} onValueChange={setAmountFilter}>
                  <SelectTrigger className="h-8 bg-zaago-background border-zaago-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zaago-card border-zaago-border">
                    <SelectItem value="all">All Amounts</SelectItem>
                    <SelectItem value="low">Under ₹500</SelectItem>
                    <SelectItem value="medium">₹500 - ₹2000</SelectItem>
                    <SelectItem value="high">Over ₹2000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="p-2">
                <label className="text-xs font-medium text-zaago-muted-foreground mb-1 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 bg-zaago-background border-zaago-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zaago-card border-zaago-border">
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="amount_high">Highest Amount</SelectItem>
                    <SelectItem value="amount_low">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DropdownMenuSeparator className="bg-zaago-border" />
              <DropdownMenuItem 
                onClick={() => {
                  setStatusFilter('all');
                  setDateFilter('all');
                  setAmountFilter('all');
                  setSortBy('newest');
                }}
                className="text-zaago-muted-foreground hover:bg-zaago-accent hover:text-foreground"
              >
                Clear All Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            onClick={fetchOrders} 
            disabled={loading}
            className="bg-transparent border border-zaago-border text-foreground hover:bg-zaago-accent flex items-center gap-2"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
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

      {/* Active Filters Indicator */}
      {(statusFilter !== 'all' || dateFilter !== 'all' || amountFilter !== 'all' || sortBy !== 'newest') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <span className="text-sm text-zaago-muted-foreground">Active filters:</span>
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="bg-zaago-green/20 text-zaago-green border-zaago-green/30">
              <Package className="w-3 h-3 mr-1" />
              {statusFilter === 'new' ? 'New Orders' :
               statusFilter === 'accepted' ? 'Accepted' :
               statusFilter === 'in_transit' ? 'In Transit' : 'Delivered'}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer hover:bg-zaago-green/30 rounded" 
                onClick={() => setStatusFilter('all')}
              />
            </Badge>
          )}
          {dateFilter !== 'all' && (
            <Badge variant="secondary" className="bg-zaago-green/20 text-zaago-green border-zaago-green/30">
              <Calendar className="w-3 h-3 mr-1" />
              {dateFilter === 'today' ? 'Today' : 
               dateFilter === 'week' ? 'This Week' :
               dateFilter === 'month' ? 'This Month' : 'This Year'}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer hover:bg-zaago-green/30 rounded" 
                onClick={() => setDateFilter('all')}
              />
            </Badge>
          )}
          {amountFilter !== 'all' && (
            <Badge variant="secondary" className="bg-zaago-green/20 text-zaago-green border-zaago-green/30">
              <DollarSign className="w-3 h-3 mr-1" />
              {amountFilter === 'low' ? 'Under ₹500' :
               amountFilter === 'medium' ? '₹500-₹2000' : 'Over ₹2000'}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer hover:bg-zaago-green/30 rounded" 
                onClick={() => setAmountFilter('all')}
              />
            </Badge>
          )}
          {sortBy !== 'newest' && (
            <Badge variant="secondary" className="bg-zaago-green/20 text-zaago-green border-zaago-green/30">
              Sort: {sortBy === 'oldest' ? 'Oldest' :
                     sortBy === 'amount_high' ? 'High Amount' : 'Low Amount'}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer hover:bg-zaago-green/30 rounded" 
                onClick={() => setSortBy('newest')}
              />
            </Badge>
          )}
        </motion.div>
      )}

      {/* Orders List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-bold text-foreground">
          {statusFilter === 'all' ? 'All Orders' :
           statusFilter === 'new' ? 'New Orders' :
           statusFilter === 'accepted' ? 'Accepted Orders' :
           statusFilter === 'in_transit' ? 'In Transit Orders' :
           'Delivered Orders'} ({filteredOrders.length})
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
                                      <p className="font-medium text-foreground">{item.name || item.product_name || 'Product'}</p>
                                      <p className="text-zaago-muted-foreground text-sm">
                                        Qty: {item.quantity} × ₹{item.price?.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <p className="font-semibold text-foreground">
                                      ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Simple action buttons based on order status */}
                        {user?.id && order.items?.some((item: any) => item.seller_id === user.id) && (
                          <div className="flex gap-3 pt-3 border-t border-zaago-border/30 mt-3">
                            {(order.status === 'pending' || order.status === 'placed') && (
                              <>
                                <Button
                                  onClick={() => handleAcceptOrder(order.id, user.id)}
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
                                      Accept Order
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleRejectOrder(order.id, user.id)}
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
                            
                            {order.status === 'accepted' && (
                              <Button
                                onClick={() => handlePackOrder(order.id, user.id)}
                                disabled={isProcessing === order.id}
                                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                                size="sm"
                              >
                                {isProcessing === order.id ? (
                                  <>
                                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                                    Notifying Agents...
                                  </>
                                ) : (
                                  <>
                                    <Package className="w-4 h-4" />
                                    Pack Order
                                  </>
                                )}
                              </Button>
                            )}

                            {order.status === 'packed' && (
                              <Button
                                onClick={() => handleNotifyAgents(order.id, user.id)}
                                disabled={isProcessing === order.id}
                                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                                size="sm"
                              >
                                {isProcessing === order.id ? (
                                  <>
                                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                                    Notifying Agents...
                                  </>
                                ) : (
                                  <>
                                    <Package className="w-4 h-4" />
                                    Packed
                                  </>
                                )}
                              </Button>
                            )}

                            {order.status === 'assigned' && (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  Assigned to Delivery Agent
                                </Badge>
                              </div>
                            )}

                            {/* View Details button for packed/delivered orders */}
                            {['packed', 'in_transit', 'delivered'].includes(order.status) && (
                              <Link to={`/orders/${order.id}`} className="flex-1">
                                <Button
                                  variant="outline"
                                  className="w-full border-zaago-border text-zaago-muted-foreground hover:bg-zaago-accent/50 hover:text-foreground hover:border-zaago-green transition-all duration-200 flex items-center gap-2"
                                  size="sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </Button>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-zaago-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Orders Found</h3>
                  <p className="text-zaago-muted-foreground mb-6">
                    {statusFilter === 'all' 
                      ? "You don't have any orders containing your products yet. Once customers start purchasing your products, their orders will appear here."
                      : `No ${statusFilter} orders found.`
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
        </motion.div>

      <LocationSetupModal 
        open={isLocationModalOpen} 
        onOpenChange={setIsLocationModalOpen}
      />
    </div>
  );
};

export default CustomerOrders;