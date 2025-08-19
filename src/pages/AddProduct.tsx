import { motion } from 'framer-motion';
import { PlusCircle, Upload, Tag, DollarSign, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AddProductPage() {
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
        className="flex items-center gap-4"
      >
        <Link to="/products" className="zaago-button-ghost p-2">
          ←
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <PlusCircle className="w-8 h-8 text-primary" />
            Add New Product
          </h1>
          <p className="text-secondary mt-1">Create a new product listing</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="zaago-card p-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Product Name
              </label>
              <input
                type="text"
                placeholder="Enter product name"
                className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                placeholder="Describe your product..."
                rows={4}
                className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Stock
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Product Images
              </label>
              <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center zaago-button-ghost transition-all">
                <Upload className="w-12 h-12 text-secondary mx-auto mb-4" />
                <p className="text-secondary mb-2">Drop images here or click to upload</p>
                <p className="text-sm text-secondary">PNG, JPG up to 5MB each</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                <option value="">Select category</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="home">Home & Garden</option>
                <option value="books">Books</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-border">
          <button className="zaago-button-primary px-8 py-3 font-semibold">
            Create Product
          </button>
          <Link to="/products">
            <button className="zaago-button-ghost px-8 py-3 font-semibold w-full sm:w-auto">
              Cancel
            </button>
          </Link>
        </div>

        <p className="text-center text-secondary text-sm mt-6">
          Add Product (placeholder) - Ready for product creation functionality
        </p>
      </motion.div>
    </motion.div>
  );
}