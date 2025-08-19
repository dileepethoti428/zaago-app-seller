import { motion } from 'framer-motion';
import { Package, Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProductsPage() {
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
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Products
          </h1>
          <p className="text-secondary mt-1">Manage your product inventory</p>
        </div>
        
        <Link to="/products/new">
          <button className="zaago-button-primary px-6 py-3 flex items-center gap-2 font-semibold">
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </Link>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="zaago-card p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <button className="zaago-button-ghost px-4 py-3 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>
      </motion.div>

      {/* Products Grid Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="zaago-card p-8 text-center"
      >
        <Package className="w-20 h-20 text-secondary mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Products List</h3>
        <p className="text-secondary mb-6">
          Product listing will be implemented here. This is a placeholder screen ready for your inventory system.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted rounded-2xl p-4 animate-pulse">
              <div className="h-32 bg-border rounded-xl mb-4"></div>
              <div className="h-4 bg-border rounded mb-2"></div>
              <div className="h-3 bg-border rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}