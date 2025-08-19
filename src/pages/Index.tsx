import { motion } from 'framer-motion';
import { Package, Truck, TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const stats = [
    { label: 'Total Products', value: '2,345', icon: Package, trend: '+12%' },
    { label: 'Active Orders', value: '87', icon: ShoppingCart, trend: '+5%' },
    { label: 'Deliveries', value: '156', icon: Truck, trend: '+18%' },
    { label: 'Revenue', value: '$45,231', icon: DollarSign, trend: '+23%' },
  ];

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
          <div className="space-y-4">
            {[
              { action: 'New order received', item: 'Wireless Headphones', time: '2 minutes ago' },
              { action: 'Product updated', item: 'Smart Watch Pro', time: '1 hour ago' },
              { action: 'Delivery completed', item: 'Laptop Stand', time: '3 hours ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-foreground font-medium">{activity.action}</p>
                  <p className="text-secondary text-sm">{activity.item}</p>
                </div>
                <span className="text-secondary text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Index;
