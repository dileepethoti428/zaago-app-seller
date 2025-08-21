import { motion } from 'framer-motion';
import { Package, Truck, TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { label: 'Total Products', value: '0', icon: Package, trend: '+0%' },
    { label: 'Active Orders', value: '0', icon: ShoppingCart, trend: '+0%' },
    { label: 'Deliveries', value: '0', icon: Truck, trend: '+0%' },
    { label: 'Revenue', value: '$0', icon: DollarSign, trend: '+0%' },
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSellerData();
    }
  }, [user]);

  const fetchSellerData = async () => {
    try {
      setLoading(true);
      
      // Get seller profile
      const { data: seller } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!seller) return;

      // Get total products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('is_active', true);

      // Get active orders (orders with seller's products)
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['placed', 'confirmed', 'assigned', 'out_for_delivery']);

      // Filter orders that contain seller's products
      let activeOrdersCount = 0;
      let totalRevenue = 0;
      let deliveriesCount = 0;

      if (allOrders) {
        const { data: sellerProducts } = await supabase
          .from('products')
          .select('id')
          .eq('seller_id', user.id);

        const sellerProductIds = sellerProducts?.map(p => p.id) || [];

        for (const order of allOrders) {
          const items = Array.isArray(order.items) ? order.items : [];
          const hasSellerProduct = items.some((item: any) => sellerProductIds.includes(item.id));
          
          if (hasSellerProduct) {
            if (['placed', 'confirmed', 'assigned', 'out_for_delivery'].includes(order.status)) {
              activeOrdersCount++;
            }
            if (order.delivered) {
              deliveriesCount++;
              // Calculate revenue from seller's products only
              const sellerItems = items.filter((item: any) => sellerProductIds.includes(item.id));
              const orderRevenue = sellerItems.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);
              totalRevenue += Number(orderRevenue);
            }
          }
        }
      }

      // Get recent orders for activity
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const activities = [];
      if (recentOrders) {
        const { data: sellerProducts } = await supabase
          .from('products')
          .select('id, name')
          .eq('seller_id', user.id);

        const sellerProductIds = sellerProducts?.map(p => p.id) || [];

        for (const order of recentOrders) {
          const items = Array.isArray(order.items) ? order.items : [];
          const sellerItems = items.filter((item: any) => sellerProductIds.includes(item.id));
          
          if (sellerItems.length > 0) {
            const productName = (sellerItems[0] as any).name || 'Unknown Product';
            const timeAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60));
            
            if (order.delivered) {
              activities.push({
                action: 'Delivery completed',
                item: productName,
                time: timeAgo < 60 ? `${timeAgo} minutes ago` : `${Math.floor(timeAgo / 60)} hours ago`
              });
            } else {
              activities.push({
                action: 'New order received',
                item: productName,
                time: timeAgo < 60 ? `${timeAgo} minutes ago` : `${Math.floor(timeAgo / 60)} hours ago`
              });
            }
          }
        }
      }

      setStats([
        { label: 'Total Products', value: productsCount?.toString() || '0', icon: Package, trend: '+12%' },
        { label: 'Active Orders', value: activeOrdersCount.toString(), icon: ShoppingCart, trend: '+5%' },
        { label: 'Deliveries', value: deliveriesCount.toString(), icon: Truck, trend: '+18%' },
        { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, trend: '+23%' },
      ]);

      setRecentActivity(activities.slice(0, 3));

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
      className="space-y-8"
    >
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="zaago-card p-8 text-center"
      >
        <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
          <span className="text-primary">Zaago</span> Seller Dashboard
        </h1>
        <p className="text-secondary text-lg">
          Manage your products, track deliveries, and grow your business
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ label, value, icon: Icon, trend }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
            className="zaago-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Icon className="w-8 h-8 text-primary" />
              <span className="text-sm text-primary font-medium">{trend}</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{value}</h3>
            <p className="text-secondary text-sm">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="zaago-card p-8"
      >
        <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/products/new" className="zaago-button-ghost p-6 text-left group">
            <Package className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Add Product</h3>
            <p className="text-secondary">Create a new product listing</p>
          </Link>
          
          <Link to="/products" className="zaago-button-ghost p-6 text-left group">
            <ShoppingCart className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Manage Products</h3>
            <p className="text-secondary">View and edit your inventory</p>
          </Link>
          
          <Link to="/deliveries" className="zaago-button-ghost p-6 text-left group">
            <Truck className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Track Deliveries</h3>
            <p className="text-secondary">Monitor shipment status</p>
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
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-foreground font-medium">{activity.action}</p>
                    <p className="text-secondary text-sm">{activity.item}</p>
                  </div>
                  <span className="text-secondary text-sm">{activity.time}</span>
                </div>
              )) : (
                <div className="text-center py-8 text-secondary">
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
