import { motion } from 'framer-motion';
import { Package, Truck, ShoppingCart, DollarSign, Calendar, AlertTriangle, CheckCircle, CheckCircle2, Clock, MapPin, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerLookupDialog } from '@/components/CustomerLookupDialog';
import { ProductSuggestionsPanel } from '@/components/ProductSuggestionsPanel';
import { useTomorrowOrdersOverview } from '@/hooks/useTomorrowOrdersOverview';
import { useTodayOrdersOverview } from '@/hooks/useTodayOrdersOverview';
import { useTodayRegularOrdersOverview } from '@/hooks/useTodayRegularOrdersOverview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [subscriptionView, setSubscriptionView] = useState<'today' | 'tomorrow'>('today');
  const [stats, setStats] = useState([
    { label: 'Total Products', value: '0', icon: Package, trend: '+0%' },
    { label: 'Active Orders', value: '0', icon: ShoppingCart, trend: '+0%' },
    { label: 'Deliveries', value: '0', icon: Truck, trend: '+0%' },
    { label: 'Revenue', value: '₹0', icon: DollarSign, trend: '+0%' },
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { data: todayOverview, isLoading: todayLoading } = useTodayOrdersOverview();
  const { data: tomorrowOverview, isLoading: tomorrowLoading } = useTomorrowOrdersOverview();
  const { data: regularOrdersOverview, isLoading: regularOrdersLoading } = useTodayRegularOrdersOverview();

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
        item: `Order #${order.id.toString().slice(0, 8)}`,
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

  // Determine which subscription overview data to show
  const currentSubscriptionData = subscriptionView === 'today' ? todayOverview : tomorrowOverview;
  const currentSubscriptionLoading = subscriptionView === 'today' ? todayLoading : tomorrowLoading;

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
        className="text-center bg-zaago-card/50 border border-zaago-border rounded-xl p-8"
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <span className="text-zaago-green">Zaago</span> 
          <span>Seller Dashboard</span>
        </h1>
        <p className="text-zaago-muted-foreground text-base sm:text-lg lg:text-xl leading-relaxed">
          Manage your products, track deliveries, and grow your business
        </p>
      </motion.div>

      {/* Regular Orders Overview Card - LIVE (MOVED TO TOP) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className={`bg-zaago-card/50 border rounded-xl p-6 ${regularOrdersOverview?.unassignedOrders && regularOrdersOverview.unassignedOrders > 0 ? 'border-purple-500/50' : 'border-zaago-border'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-purple-500" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Regular Orders Overview</h2>
            <Badge variant="outline" className="border-purple-500/50 text-purple-500 text-xs">
              LIVE
            </Badge>
          </div>
        </div>

        {regularOrdersLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3 mb-4">
              <div className="bg-background/50 border border-zaago-border rounded-lg p-3 text-center">
                <ShoppingCart className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{regularOrdersOverview?.totalOrders || 0}</p>
                <p className="text-xs text-zaago-muted-foreground">Total</p>
              </div>
              <div className="bg-background/50 border border-zaago-border rounded-lg p-3 text-center">
                <CheckCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{regularOrdersOverview?.assignedOrders || 0}</p>
                <p className="text-xs text-zaago-muted-foreground">Assigned</p>
              </div>
              <div className={`bg-background/50 border rounded-lg p-3 text-center ${(regularOrdersOverview?.unassignedOrders || 0) > 0 ? 'border-red-500/50' : 'border-zaago-border'}`}>
                <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${(regularOrdersOverview?.unassignedOrders || 0) > 0 ? 'text-red-500' : 'text-zaago-muted-foreground'}`} />
                <p className={`text-xl font-bold ${(regularOrdersOverview?.unassignedOrders || 0) > 0 ? 'text-red-500' : 'text-foreground'}`}>
                  {regularOrdersOverview?.unassignedOrders || 0}
                </p>
                <p className="text-xs text-zaago-muted-foreground">Unassigned</p>
              </div>
              <div className="bg-background/50 border border-green-500/30 rounded-lg p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-500">{regularOrdersOverview?.deliveredOrders || 0}</p>
                <p className="text-xs text-zaago-muted-foreground">Delivered</p>
              </div>
              <div className="bg-background/50 border border-amber-500/30 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-amber-500">{regularOrdersOverview?.pendingOrders || 0}</p>
                <p className="text-xs text-zaago-muted-foreground">Pending</p>
              </div>
            </div>

            {(regularOrdersOverview?.unassignedOrders || 0) > 0 && (
              <Link to="/orders?filter=unassigned">
                <Button variant="outline" className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View {regularOrdersOverview?.unassignedOrders} Unassigned Regular Order{regularOrdersOverview?.unassignedOrders !== 1 ? 's' : ''} - URGENT
                </Button>
              </Link>
            )}
          </>
        )}
      </motion.div>

      {/* Subscription Orders Overview Card - With Today/Tomorrow Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className={`bg-zaago-card/50 border rounded-xl p-6 ${
          subscriptionView === 'today' && todayOverview?.unassignedOrders && todayOverview.unassignedOrders > 0 
            ? 'border-red-500/50' 
            : subscriptionView === 'tomorrow' && tomorrowOverview?.unassignedOrders && tomorrowOverview.unassignedOrders > 0
            ? 'border-amber-500/50'
            : 'border-zaago-border'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className={`w-5 h-5 ${subscriptionView === 'today' ? 'text-red-500' : 'text-amber-500'}`} />
              {subscriptionView === 'today' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-foreground">Subscription Orders Overview</h2>
            <Badge 
              variant="outline" 
              className={`text-xs ${subscriptionView === 'today' ? 'border-red-500/50 text-red-500' : 'border-amber-500/50 text-amber-500'}`}
            >
              {subscriptionView === 'today' ? 'LIVE' : 'PLANNING'}
            </Badge>
          </div>
          
          {/* Today/Tomorrow Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={subscriptionView === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSubscriptionView('today')}
              className={subscriptionView === 'today' 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'border-zaago-border text-zaago-muted-foreground hover:bg-zaago-accent'
              }
            >
              Today
            </Button>
            <Button
              variant={subscriptionView === 'tomorrow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSubscriptionView('tomorrow')}
              className={subscriptionView === 'tomorrow' 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'border-zaago-border text-zaago-muted-foreground hover:bg-zaago-accent'
              }
            >
              Tomorrow
            </Button>
          </div>
        </div>

        {/* Location Badge */}
        {currentSubscriptionData?.locationId && (
          <div className="flex justify-end mb-4">
            <Badge variant="outline" className="flex items-center gap-1 border-zaago-border text-zaago-muted-foreground">
              <MapPin className="w-3 h-3" />
              Location {currentSubscriptionData.locationId}
            </Badge>
          </div>
        )}

        {currentSubscriptionLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${subscriptionView === 'today' ? 'border-red-500' : 'border-amber-500'}`}></div>
          </div>
        ) : !currentSubscriptionData?.locationId ? (
          <div className="text-center py-6 text-zaago-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No location set. Please configure your location first.</p>
          </div>
        ) : (
          <>
            <div className={`grid ${subscriptionView === 'today' ? 'grid-cols-5' : 'grid-cols-3'} gap-3 mb-4`}>
              <div className="bg-background/50 border border-zaago-border rounded-lg p-3 text-center">
                <Package className={`w-5 h-5 mx-auto mb-1 ${subscriptionView === 'today' ? 'text-red-500' : 'text-amber-500'}`} />
                <p className="text-xl font-bold text-foreground">{currentSubscriptionData.totalOrders}</p>
                <p className="text-xs text-zaago-muted-foreground">Total</p>
              </div>
              <div className="bg-background/50 border border-zaago-border rounded-lg p-3 text-center">
                <CheckCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{currentSubscriptionData.assignedOrders}</p>
                <p className="text-xs text-zaago-muted-foreground">Assigned</p>
              </div>
              <div className={`bg-background/50 border rounded-lg p-3 text-center ${currentSubscriptionData.unassignedOrders > 0 ? 'border-red-500/50' : 'border-zaago-border'}`}>
                <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${currentSubscriptionData.unassignedOrders > 0 ? 'text-red-500' : 'text-zaago-muted-foreground'}`} />
                <p className={`text-xl font-bold ${currentSubscriptionData.unassignedOrders > 0 ? 'text-red-500' : 'text-foreground'}`}>
                  {currentSubscriptionData.unassignedOrders}
                </p>
                <p className="text-xs text-zaago-muted-foreground">Unassigned</p>
              </div>
              {subscriptionView === 'today' && todayOverview && (
                <>
                  <div className="bg-background/50 border border-green-500/30 rounded-lg p-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-green-500">{todayOverview.deliveredOrders}</p>
                    <p className="text-xs text-zaago-muted-foreground">Delivered</p>
                  </div>
                  <div className="bg-background/50 border border-amber-500/30 rounded-lg p-3 text-center">
                    <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-amber-500">{todayOverview.pendingOrders}</p>
                    <p className="text-xs text-zaago-muted-foreground">Pending</p>
                  </div>
                </>
              )}
            </div>

            {currentSubscriptionData.unassignedOrders > 0 && (
              <Link to={`/unassigned-orders?tab=${subscriptionView}`}>
                <Button 
                  variant="outline" 
                  className={`w-full ${subscriptionView === 'today' 
                    ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' 
                    : 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View {currentSubscriptionData.unassignedOrders} Unassigned Order{currentSubscriptionData.unassignedOrders !== 1 ? 's' : ''} {subscriptionView === 'today' ? '- URGENT' : ''}
                </Button>
              </Link>
            )}
          </>
        )}
      </motion.div>

      {/* Revenue Period Filter (MOVED BELOW OVERVIEW CARDS) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="flex items-center justify-between bg-zaago-card/50 border border-zaago-border rounded-xl p-6"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-zaago-green" />
          <h2 className="text-lg font-semibold text-foreground">Revenue Period</h2>
        </div>
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
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map(({ label, value, icon: Icon, trend }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
            className="bg-zaago-card/50 border border-zaago-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Icon className="w-8 h-8 text-zaago-green" />
              <span className="text-sm text-zaago-green font-medium">{trend}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{value}</h3>
            <p className="text-zaago-muted-foreground text-sm">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="bg-zaago-card/50 border border-zaago-border rounded-xl p-6"
      >
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/products/new" className="p-6 text-center group hover:bg-zaago-accent/50 rounded-lg transition-colors focus:outline-none active:bg-zaago-accent/70">
            <Package className="w-12 h-12 text-zaago-green mb-4 mx-auto group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Add Product</h3>
            <p className="text-zaago-muted-foreground text-sm">Create a new product listing</p>
          </Link>
          
          <Link to="/products" className="p-6 text-center group hover:bg-zaago-accent/50 rounded-lg transition-colors focus:outline-none active:bg-zaago-accent/70">
            <ShoppingCart className="w-12 h-12 text-zaago-green mb-4 mx-auto group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Manage Products</h3>
            <p className="text-zaago-muted-foreground text-sm">View and edit your inventory</p>
          </Link>
          
          <CustomerLookupDialog />
        </div>
      </motion.div>

      {/* Product Suggestions Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-zaago-card p-6 rounded-lg border border-zaago-border"
      >
        <ProductSuggestionsPanel />
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="bg-zaago-card/50 border border-zaago-border rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-zaago-border">
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 hover:bg-zaago-accent/50 rounded-lg transition-colors">
                  <div className="w-2 h-2 bg-zaago-green rounded-full shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium">{activity.action}</p>
                    <p className="text-zaago-muted-foreground text-sm">{activity.item}</p>
                  </div>
                  <span className="text-zaago-muted-foreground text-sm shrink-0">{activity.time}</span>
                </div>
              )) : (
                <div className="text-center py-8 text-zaago-muted-foreground">
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
