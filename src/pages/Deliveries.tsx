import { motion } from 'framer-motion';
import { Truck, Clock, CheckCircle, Package, MapPin, Filter } from 'lucide-react';

const deliveryStatuses = [
  { label: 'Pending', count: 12, color: 'text-yellow-400', icon: Clock },
  { label: 'In Transit', count: 8, color: 'text-blue-400', icon: Truck },
  { label: 'Delivered', count: 45, color: 'text-primary', icon: CheckCircle },
];

const sampleDeliveries = [
  { id: '001', customer: 'John Smith', product: 'Wireless Headphones', status: 'In Transit', address: '123 Main St, New York' },
  { id: '002', customer: 'Sarah Johnson', product: 'Smart Watch', status: 'Pending', address: '456 Oak Ave, Los Angeles' },
  { id: '003', customer: 'Mike Davis', product: 'Laptop Stand', status: 'Delivered', address: '789 Pine Rd, Chicago' },
];

export default function DeliveriesPage() {
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
          Deliveries
        </h1>
        <p className="text-secondary mt-1">Track and manage your deliveries</p>
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
              className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-3 bg-input border border-border rounded-2xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="transit">In Transit</option>
              <option value="delivered">Delivered</option>
            </select>
            <button className="zaago-button-ghost px-4 py-3 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              More Filters
            </button>
          </div>
        </div>
      </motion.div>

      {/* Deliveries List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="zaago-card"
      >
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Recent Deliveries</h2>
        </div>

        <div className="divide-y divide-border">
          {sampleDeliveries.map((delivery, index) => (
            <motion.div
              key={delivery.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
              className="p-6 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Order #{delivery.id}</h3>
                    <p className="text-secondary text-sm mt-1">{delivery.customer}</p>
                    <p className="text-foreground mt-1">{delivery.product}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-secondary">
                      <MapPin className="w-4 h-4" />
                      {delivery.address}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    delivery.status === 'Delivered' ? 'bg-primary/20 text-primary' :
                    delivery.status === 'In Transit' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {delivery.status}
                  </span>
                  <button className="zaago-button-ghost px-4 py-2 text-sm">
                    Track
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-6 text-center border-t border-border">
          <p className="text-secondary text-sm">
            Deliveries List (placeholder) - Ready for delivery tracking system integration
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}