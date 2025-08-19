import { motion } from 'framer-motion';
import { Edit, Save, Trash2, Tag, DollarSign, Package, Upload } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export default function EditProductPage() {
  const { id } = useParams();

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
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link to="/products" className="zaago-button-ghost p-2">
            ←
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Edit className="w-8 h-8 text-primary" />
              Edit Product
            </h1>
            <p className="text-secondary mt-1">Product ID: {id || 'example-123'}</p>
          </div>
        </div>

        <button className="zaago-button-ghost p-3 text-destructive hover:bg-destructive/10">
          <Trash2 className="w-5 h-5" />
        </button>
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
                defaultValue="Sample Product Name"
                className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                defaultValue="This is a sample product description that would be loaded from your database."
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
                  defaultValue="99.99"
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
                  defaultValue="50"
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select 
                defaultValue="electronics"
                className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Select category</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="home">Home & Garden</option>
                <option value="books">Books</option>
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Product Images
              </label>
              
              {/* Current Images */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[1, 2].map((i) => (
                  <div key={i} className="relative group">
                    <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center">
                      <Package className="w-8 h-8 text-secondary" />
                    </div>
                    <button className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload New */}
              <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center zaago-button-ghost transition-all">
                <Upload className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-secondary text-sm">Add more images</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Product Status</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-foreground">Active</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" />
                  <span className="text-foreground">Featured</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-foreground">In Stock</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-border">
          <button className="zaago-button-primary px-8 py-3 font-semibold flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Changes
          </button>
          <Link to="/products">
            <button className="zaago-button-ghost px-8 py-3 font-semibold w-full sm:w-auto">
              Cancel
            </button>
          </Link>
        </div>

        <p className="text-center text-secondary text-sm mt-6">
          Edit Product (placeholder) - Ready for product update functionality
        </p>
      </motion.div>
    </motion.div>
  );
}