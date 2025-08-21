import { motion } from 'framer-motion';
import { Truck, Clock, CheckCircle, Package, MapPin, Filter, Calendar, Download, CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DeliveredOrder {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  created_at: string;
  items: any; // JSONB field from database
  address: any; // JSONB field from database
  status: string;
  user_id: string | null;
  agent_id: string | null;
  delivered: boolean | null;
  delivery_date: string | null;
  delivery_time_slot: string | null;
  payment_id: string;
  payment_status: string | null;
  special_instructions: string | null;
  updated_at: string;
}

interface DeliveryStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface ProductTotal {
  name: string;
  quantity: number;
  orders: number;
}

export default function DeliveriesPage() {
  const { user } = useAuth();
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [stats, setStats] = useState<DeliveryStats>({ today: 0, thisWeek: 0, thisMonth: 0 });
  const [productTotals, setProductTotals] = useState<ProductTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const calculateProductTotals = async (orders: DeliveredOrder[]) => {
    if (!user?.id || orders.length === 0) {
      setProductTotals([]);
      return;
    }

    try {
      // Get all seller's products to filter correctly
      const { data: sellerProducts, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('seller_id', user.id);

      if (error) {
        console.error('Error fetching seller products:', error);
        return;
      }

      const sellerProductMap = new Map(sellerProducts?.map(p => [p.id, p.name]) || []);
      const totalsMap: { [key: string]: { quantity: number; orders: Set<string> } } = {};
      
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            // Only count items that belong to this seller
            if (sellerProductMap.has(item.id)) {
              const productName = sellerProductMap.get(item.id) || item.name || 'Unknown Product';
              const quantity = parseInt(item.quantity) || 0;
              
              if (!totalsMap[productName]) {
                totalsMap[productName] = { quantity: 0, orders: new Set() };
              }
              
              totalsMap[productName].quantity += quantity;
              totalsMap[productName].orders.add(order.id);
            }
          });
        }
      });

      const productTotalsArray = Object.entries(totalsMap).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        orders: data.orders.size, // Use Set size to count unique orders
      })).sort((a, b) => b.quantity - a.quantity);

      setProductTotals(productTotalsArray);
    } catch (error) {
      console.error('Error calculating product totals:', error);
      setProductTotals([]);
    }
  };

  const exportDeliveryReport = () => {
    if (filteredOrders.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No deliveries available for the selected date",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare detailed orders data
      const orderRows = filteredOrders.flatMap(order => {
        if (order.items && Array.isArray(order.items)) {
          return order.items.map((item: any) => ({
            'Date': new Date(order.created_at).toLocaleDateString(),
            'Time': new Date(order.created_at).toLocaleTimeString(),
            'Order ID': order.id.slice(0, 8),
            'Customer Name': order.customer_name || 'N/A',
            'Customer Phone': order.customer_phone || 'N/A',
            'Product Name': item.name || 'Unknown Product',
            'Quantity': item.quantity || 0,
            'Unit Price (₹)': item.unit_price || 0,
            'Item Total (₹)': (item.quantity || 0) * (item.unit_price || 0),
            'Order Total (₹)': order.total,
            'Payment Status': order.payment_status || 'N/A',
            'Delivery Address': order.address?.full_address || 'N/A',
            'City': order.address?.city || 'N/A',
            'Special Instructions': order.special_instructions || 'None',
          }));
        }
        return [];
      });

      // Add separator row
      const separatorRow = {
        'Date': '',
        'Time': '',
        'Order ID': '--- PRODUCT SUMMARY ---',
        'Customer Name': '',
        'Customer Phone': '',
        'Product Name': '',
        'Quantity': '',
        'Unit Price (₹)': '',
        'Item Total (₹)': '',
        'Order Total (₹)': '',
        'Payment Status': '',
        'Delivery Address': '',
        'City': '',
        'Special Instructions': '',
      };

      // Prepare product totals summary
      const summaryRows = productTotals.map(product => ({
        'Date': selectedDate,
        'Time': '',
        'Order ID': 'SUMMARY',
        'Customer Name': '',
        'Customer Phone': '',
        'Product Name': product.name,
        'Quantity': product.quantity,
        'Unit Price (₹)': '',
        'Item Total (₹)': '',
        'Order Total (₹)': '',
        'Payment Status': '',
        'Delivery Address': `${product.orders} orders delivered`,
        'City': '',
        'Special Instructions': `Restock Level: ${
          product.quantity > 50 ? 'High' :
          product.quantity > 20 ? 'Medium' : 'Low'
        }`,
      }));

      // Combine all data
      const allRows = [...orderRows, separatorRow, ...summaryRows];

      // Generate CSV
      const csv = Papa.unparse(allRows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      
      // Generate filename with date
      const filename = `zaago-delivery-report-${selectedDate}.csv`;
      saveAs(blob, filename);

      toast({
        title: "Export Successful",
        description: `Delivery report for ${selectedDate} has been downloaded`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate the delivery report",
        variant: "destructive",
      });
    }
  };

  const fetchDeliveredOrders = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        console.error('No user found');
        return;
      }

      // Get seller's orders - prioritize delivered orders but show all for comprehensive view
      const { data: allOrders, error } = await supabase.rpc('get_seller_orders', {
        seller_user_id: user.id,
        status_filter: null // Get all orders, then filter locally for better control
      });

      if (error) {
        console.error('Error fetching seller orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
        return;
      }

      if (!allOrders || allOrders.length === 0) {
        setDeliveredOrders([]);
        await calculateProductTotals([]);
        return;
      }

      // Get all product IDs from the orders
      const productIds = new Set<string>();
      allOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (item.id) productIds.add(item.id);
          });
        }
      });

      if (productIds.size === 0) {
        setDeliveredOrders([]);
        await calculateProductTotals([]);
        return;
      }

      // Get products that belong to this seller
      const { data: sellerProducts, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user?.id)
        .in('id', Array.from(productIds));

      if (productError) {
        console.error('Error fetching seller products:', productError);
        return;
      }

      const sellerProductIds = new Set(sellerProducts?.map(p => p.id) || []);

      // Filter orders that contain products from this seller AND match the selected date
      const sellerOrders = allOrders.filter(order => {
        if (!order.items || !Array.isArray(order.items)) return false;
        
        // Check if any item in the order belongs to this seller
        const hasSellerProduct = order.items.some((item: any) => sellerProductIds.has(item.id));
        
        // Also filter by selected date
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        const matchesDate = orderDate === selectedDate;
        
        return hasSellerProduct && matchesDate;
      });

      // Sort orders to show delivered first, then by status priority
      const statusPriority = {
        'delivered': 1,
        'out_for_delivery': 2,
        'assigned': 3,
        'confirmed': 4,
        'placed': 5
      };

      const sortedOrders = sellerOrders.sort((a, b) => {
        const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 999;
        const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 999;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Map to the correct format with enhanced delivery detection
      const mappedOrders = sortedOrders.map(order => ({
        id: order.order_id,
        customer_name: order.customer_name || 'N/A',
        customer_phone: order.customer_phone || 'N/A',
        address: order.address,
        items: order.items,
        total: order.seller_total || 0,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        agent_id: order.agent_id,
        delivered: order.delivered || order.status === 'delivered', // Enhanced delivery detection
        delivery_date: order.delivery_date,
        delivery_time_slot: null,
        payment_id: '',
        payment_status: order.payment_status || 'Pending',
        special_instructions: order.special_instructions,
        user_id: order.user_id,
      }));

      setDeliveredOrders(mappedOrders);
      await calculateProductTotals(mappedOrders);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (!user?.id) {
        console.error('No user found');
        return;
      }

      // Use the new seller stats function
      const { data: statsData, error } = await supabase.rpc('get_seller_stats', {
        seller_user_id: user.id
      });

      if (error) {
        console.error('Error fetching seller stats:', error);
        return;
      }

      if (statsData && typeof statsData === 'object') {
        const stats_obj = statsData as any;
        setStats({
          today: stats_obj.today_orders || 0,
          thisWeek: stats_obj.week_orders || 0,
          thisMonth: stats_obj.month_orders || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchDeliveredOrders();
  }, [selectedDate]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-refresh data every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDeliveredOrders();
      fetchStats();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [selectedDate]);

  // Set up realtime subscription for order updates
  useEffect(() => {
    const channel = supabase
      .channel('seller-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order updated:', payload);
          const updatedOrder = payload.new as any;
          
          // Check if this order contains seller's products by refreshing data
          // We refresh data to ensure we have the most up-to-date seller-specific information
          fetchDeliveredOrders();
          fetchStats();
          
          // Show notification for delivered orders
          if (updatedOrder.status === 'delivered' || updatedOrder.delivered === true) {
            toast({
              title: "Delivery Completed! 🎉",
              description: `Order ${updatedOrder.id.slice(0, 8)} has been successfully delivered`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('New order created:', payload);
          // Refresh data when new orders are created
          setTimeout(() => {
            fetchDeliveredOrders();
            fetchStats();
          }, 1000); // Small delay to ensure data consistency
        }
      )
      // Also listen for delivery_history updates for additional delivery confirmation
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_history',
        },
        (payload) => {
          console.log('Delivery history updated:', payload);
          // Refresh data when delivery history is updated
          fetchDeliveredOrders();
          fetchStats();
          toast({
            title: "Delivery Confirmed! ✅",
            description: "A delivery has been recorded in the system",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, toast]);

  const filteredOrders = deliveredOrders.filter(order =>
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deliveryStatuses = [
    { label: 'Today', count: stats.today, color: 'text-primary', icon: CheckCircle },
    { label: 'This Week', count: stats.thisWeek, color: 'text-blue-400', icon: Calendar },
    { label: 'This Month', count: stats.thisMonth, color: 'text-green-400', icon: Truck },
  ];

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
      >
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Truck className="w-8 h-8 text-primary" />
          Delivered Orders
        </h1>
        <p className="text-secondary mt-1">Track completed deliveries and manage inventory</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {deliveryStatuses.map(({ label, count, color, icon: Icon }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
            className="zaago-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">{label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{count}</p>
              </div>
              <Icon className={`w-12 h-12 ${color}`} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="zaago-card p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by customer name or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal px-4 py-3 bg-input border border-border rounded-2xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(new Date(selectedDate), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate ? new Date(selectedDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date.toISOString().split('T')[0]);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </motion.div>

      {/* Product Totals Analytics */}
      {!loading && deliveredOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="zaago-card"
        >
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Product-wise Inventory Summary</h2>
              <p className="text-sm text-secondary">
                {deliveredOrders.length} orders • {productTotals.reduce((sum, p) => sum + p.quantity, 0)} items delivered
              </p>
            </div>
          </div>

          <div className="p-6">
            {productTotals.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-secondary mx-auto mb-4" />
                <p className="text-secondary">No product data available for this date</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productTotals.map((product, index) => (
                  <motion.div
                    key={product.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                    className="p-4 bg-muted/30 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-xs text-secondary bg-background px-2 py-1 rounded-lg">
                        {product.orders} orders
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{product.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">{product.quantity}</span>
                      <span className="text-sm text-secondary">units</span>
                    </div>
                    
                    {/* Stock Planning Indicator */}
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-secondary">Restock Level:</span>
                        <span className={`font-medium ${
                          product.quantity > 50 ? 'text-green-400' :
                          product.quantity > 20 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {product.quantity > 50 ? 'High' :
                           product.quantity > 20 ? 'Medium' :
                           'Low'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Deliveries List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="zaago-card"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Delivered Orders ({filteredOrders.length})
            </h2>
            {filteredOrders.length > 0 && (
              <button
                onClick={exportDeliveryReport}
                className="zaago-button-ghost px-4 py-2 text-sm flex items-center gap-2 hover:bg-primary/10 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-secondary">Loading deliveries...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-secondary mx-auto mb-4" />
              <p className="text-secondary">
                {searchTerm ? 'No deliveries match your search' : 'No deliveries for this date'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                className="p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <CheckCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Order #{order.id.slice(0, 8)}</h3>
                      <p className="text-secondary text-sm mt-1">{order.customer_name}</p>
                      <p className="text-secondary text-sm">{order.customer_phone}</p>
                      
                      {/* Order Items */}
                      <div className="mt-2 space-y-1">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="text-sm text-foreground">
                            {item.name} × {item.quantity}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 text-sm text-secondary">
                        <MapPin className="w-4 h-4" />
                        {order.address?.full_address}, {order.address?.city}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">₹{order.total}</p>
                      <p className="text-sm text-secondary">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                     <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                       order.status === 'delivered' || order.delivered 
                         ? 'bg-green-500/20 text-green-600' 
                         : order.status === 'out_for_delivery' 
                         ? 'bg-yellow-500/20 text-yellow-600'
                         : order.status === 'assigned'
                         ? 'bg-blue-500/20 text-blue-600'
                         : 'bg-primary/20 text-primary'
                     }`}>
                       {order.status === 'delivered' || order.delivered ? 'Delivered' : 
                        order.status === 'out_for_delivery' ? 'Out for Delivery' :
                        order.status === 'assigned' ? 'Assigned' :
                        order.status === 'confirmed' ? 'Confirmed' : 'Placed'}
                     </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}