import { motion } from 'framer-motion';
import { 
  Package, 
  Truck, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerLookupDialog } from '@/components/CustomerLookupDialog';
import { TodaysOrdersSummary } from '@/components/TodaysOrdersSummary';


const Dashboard = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeOrders: 0,
    deliveredToday: 0,
    todayRevenue: 0,
    weekOrders: 0,
    weekRevenue: 0,
    monthRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const timePeriods = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedPeriod]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch seller stats using the existing function
      const { data: statsData, error: statsError } = await supabase.rpc('get_seller_stats', {
        seller_user_id: user.id
      });

      if (statsError) {
        console.error('Error fetching stats:', statsError);
      } else if (statsData) {
        // Cast the data to any to handle the Json type safely
        const stats_obj = statsData as any;
        
        setStats({
          totalProducts: stats_obj?.total_products || 0,
          activeOrders: stats_obj?.active_orders || 0,
          deliveredToday: stats_obj?.total_deliveries || 0,
          todayRevenue: stats_obj?.today_revenue || 0,
          weekOrders: stats_obj?.week_orders || 0,
          weekRevenue: stats_obj?.week_revenue || 0,
          monthRevenue: stats_obj?.month_revenue || 0
        });
      }

      // Fetch recent orders using seller RPC for correct seller-scoped data
      const { data: ordersData, error: ordersError } = await supabase
        .rpc('get_seller_orders', {
          seller_user_id: user.id,
          status_filter: null
        });

      if (!ordersError && ordersData) {
        // RPC returns orders sorted by created_at desc, take first 5
        setRecentOrders((ordersData as any[]).slice(0, 5));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'placed':
      case 'confirmed':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'out_for_delivery':
        return <Truck className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-secondary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-primary';
      case 'placed':
      case 'confirmed':
        return 'text-yellow-500';
      case 'out_for_delivery':
        return 'text-blue-500';
      default:
        return 'text-secondary';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 sm:space-y-8"
    >
      
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-zaago-muted-foreground text-sm sm:text-base">
            Welcome back! Here's what's happening with your store.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-zaago-green" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px] bg-transparent border-zaago-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zaago-card border-zaago-border">
              {timePeriods.map((period) => (
                <SelectItem key={period.value} value={period.value} className="text-foreground hover:bg-zaago-accent">
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Today's Orders Summary */}
      <TodaysOrdersSummary />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          {
            label: 'Total Products',
            value: stats.totalProducts.toString(),
            icon: Package,
            trend: '+12%',
            color: 'text-zaago-green'
          },
          {
            label: 'Active Orders',
            value: stats.activeOrders.toString(),
            icon: ShoppingCart,
            trend: '+5%',
            color: 'text-blue-500'
          },
          {
            label: 'Delivered Today',
            value: stats.deliveredToday.toString(),
            icon: Truck,
            trend: '+18%',
            color: 'text-zaago-green'
          },
          {
            label: selectedPeriod === 'today' ? 'Today Revenue' : selectedPeriod === 'week' ? 'Week Revenue' : 'Month Revenue',
            value: `₹${selectedPeriod === 'today' ? stats.todayRevenue.toFixed(2) : selectedPeriod === 'week' ? stats.weekRevenue.toFixed(2) : stats.monthRevenue.toFixed(2)}`,
            icon: DollarSign,
            trend: '+23%',
            color: 'text-zaago-green'
          }
        ].map(({ label, value, icon: Icon, trend, color }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
          >
            <Card className="bg-zaago-card/50 border-zaago-border">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${color}`} />
                  <span className="text-xs sm:text-sm text-zaago-green font-medium">{trend}</span>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-1">{value}</h3>
                <p className="text-zaago-muted-foreground text-xs sm:text-sm">{label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>



      {/* Quick Actions & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <Card className="bg-zaago-card/50 border-zaago-border h-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link 
                to="/products/new" 
                className="p-6 text-left group flex flex-col items-center text-center hover:bg-zaago-accent/50 rounded-lg transition-colors focus:outline-none focus:bg-zaago-accent/50 active:bg-zaago-accent/70"
              >
                <Package className="w-12 h-12 text-zaago-green mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-foreground mb-1">Add Product</h3>
                <p className="text-zaago-muted-foreground text-sm">Create new listing</p>
              </Link>
              
              <Link 
                to="/orders" 
                className="p-6 text-left group flex flex-col items-center text-center hover:bg-zaago-accent/50 rounded-lg transition-colors focus:outline-none focus:bg-zaago-accent/50 active:bg-zaago-accent/70"
              >
                <ShoppingCart className="w-12 h-12 text-zaago-green mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-foreground mb-1">View Orders</h3>
                <p className="text-zaago-muted-foreground text-sm">Manage your orders</p>
              </Link>

              <CustomerLookupDialog />
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <Card className="bg-zaago-card/50 border-zaago-border h-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.length > 0 ? recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zaago-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            Order #{order.id.toString().slice(0, 8)}
                          </p>
                          <p className="text-zaago-muted-foreground text-xs">
                            {order.customer_name || 'Customer'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground text-sm">₹{order.total}</p>
                        <p className={`text-xs capitalize ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-zaago-muted-foreground">
                      No recent orders found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;