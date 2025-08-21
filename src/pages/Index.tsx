import { motion } from 'framer-motion';
import { Package, Truck, TrendingUp, Users, ShoppingCart, DollarSign, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Index = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [stats, setStats] = useState([
    { label: 'Total Products', value: '0', icon: Package, trend: '+0%' },
    { label: 'Active Orders', value: '0', icon: ShoppingCart, trend: '+0%' },
    { label: 'Deliveries', value: '0', icon: Truck, trend: '+0%' },
    { label: 'Revenue', value: '₹0', icon: DollarSign, trend: '+0%' },
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const timePeriods = [
    { value: 'today', label: 'Today' },
    { value: '1week', label: '1 Week' },
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: 'all', label: 'All Time' }
  ];

  useEffect(() => {
    if (user) {
      fetchSellerData();
    }
  }, [user, selectedPeriod]);

  const fetchSellerData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Check if seller profile exists, create if not
      const { data: existingSeller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingSeller) {
        const { error: insertError } = await supabase
          .from('sellers')
          .insert({
            user_id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Seller'
          });

        if (insertError) {
          console.error('Error creating seller profile:', insertError);
        }
      }

      // Use the new seller stats function with time period for accurate data
      const { data: statsData, error: statsError } = await supabase.rpc('get_seller_stats_with_period', {
        seller_user_id: user.id,
        time_period: selectedPeriod
      });

      if (statsError) {
        console.error('Error fetching seller stats:', statsError);
        return;
      }

      const stats_obj = statsData as any;
      const totalProducts = stats_obj?.total_products || 0;
      const activeOrders = stats_obj?.active_orders || 0;
      const totalDeliveries = stats_obj?.total_deliveries || 0;
      const revenue = stats_obj?.total_revenue || 0;

      // Get recent activity using seller orders
      const { data: recentOrders, error: ordersError } = await supabase.rpc('get_seller_orders', {
        seller_user_id: user.id,
        status_filter: null
      });

      const recentActivity = recentOrders?.slice(0, 3).map((order: any) => ({
        action: order.status === 'delivered' ? 'Delivery completed' : 'New order received',
        item: `Order #${order.order_id.toString().slice(0, 8)}`,
        time: new Date(order.created_at).toLocaleString()
      })) || [];

      setStats([
        { label: 'Total Products', value: totalProducts.toString(), icon: Package, trend: '+12%' },
        { label: 'Active Orders', value: activeOrders.toString(), icon: ShoppingCart, trend: '+5%' },
        { label: 'Deliveries', value: totalDeliveries.toString(), icon: Truck, trend: '+18%' },
        { label: 'Revenue', value: `₹${revenue.toFixed(2)}`, icon: DollarSign, trend: '+23%' },
      ]);

      setRecentActivity(recentActivity);

    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="zaago-card text-center"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <span className="text-primary">Zaago</span> 
          <span>Seller Dashboard</span>
        </h1>
        <p className="text-secondary text-sm sm:text-base lg:text-lg leading-relaxed">
          Manage your products, track deliveries, and grow your business
        </p>
      </motion.div>

      {/* Time Period Filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="zaago-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Revenue Period</h2>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              {timePeriods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map(({ label, value, icon: Icon, trend }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
            className="zaago-card"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <Icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary" />
              <span className="text-xs sm:text-sm text-primary font-medium">{trend}</span>
            </div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-1">{value}</h3>
            <p className="text-secondary text-xs sm:text-sm">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="zaago-card"
      >
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Link to="/products/new" className="zaago-button-ghost p-4 sm:p-6 text-left group">
            <Package className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2">Add Product</h3>
            <p className="text-secondary text-sm">Create a new product listing</p>
          </Link>
          
          <Link to="/products" className="zaago-button-ghost p-4 sm:p-6 text-left group">
            <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2">Manage Products</h3>
            <p className="text-secondary text-sm">View and edit your inventory</p>
          </Link>
          
          <Link to="/deliveries" className="zaago-button-ghost p-4 sm:p-6 text-left group">
            <Truck className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2">Track Deliveries</h3>
            <p className="text-secondary text-sm">Monitor shipment status</p>
          </Link>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="zaago-card"
      >
        <div className="p-4 sm:p-6 border-b border-border">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl sm:rounded-2xl hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 bg-primary rounded-full shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm sm:text-base">{activity.action}</p>
                    <p className="text-secondary text-xs sm:text-sm truncate">{activity.item}</p>
                  </div>
                  <span className="text-secondary text-xs sm:text-sm shrink-0">{activity.time}</span>
                </div>
              )) : (
                <div className="text-center py-6 sm:py-8 text-secondary text-sm sm:text-base">
                  No recent activity found
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Index;
