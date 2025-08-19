import { motion } from 'framer-motion';
import { Package, Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ProductCard from '@/components/ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  is_active: boolean;
  description?: string;
  stock_quantity?: number;
  created_at: string;
  seller_id: string;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Fetch products
  const fetchProducts = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to fetch products. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('seller_id', user?.id);

      if (error) {
        console.error('Error deleting product:', error);
        toast({
          title: "Error",
          description: "Failed to delete product. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });

      // Refresh products list
      fetchProducts();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchProducts();

    // Set up real-time subscription for all products changes (for cross-seller visibility)
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('New product added:', payload);
          const newProduct = payload.new as Product;
          
          // Only add to list if it belongs to current seller
          if (newProduct.seller_id === user.id) {
            setProducts((prev) => [newProduct, ...prev]);
            toast({
              title: "Product Added",
              description: `${newProduct.name} was added successfully!`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('Product updated:', payload);
          const updatedProduct = payload.new as Product;
          
          // Only update if it belongs to current seller
          if (updatedProduct.seller_id === user.id) {
            setProducts((prev) =>
              prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
            );
            toast({
              title: "Product Updated",
              description: `${updatedProduct.name} was updated successfully!`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('Product deleted:', payload);
          const deletedProduct = payload.old as Product;
          
          // Only remove if it belonged to current seller
          if (deletedProduct.seller_id === user.id) {
            setProducts((prev) => prev.filter((p) => p.id !== deletedProduct.id));
            toast({
              title: "Product Deleted",
              description: `${deletedProduct.name} was deleted successfully!`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Filter products based on search and filter
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterActive === null || product.is_active === filterActive;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-secondary">Loading your products...</p>
          </div>
        </div>
      </motion.div>
    );
  }

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
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Your Products
          </h1>
          <p className="text-secondary mt-1">{products.length} products in your inventory</p>
        </div>
        
        <Link to="/products/new">
          <button className="zaago-button-primary px-6 py-3 font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="zaago-card p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-secondary" />
            <select
              value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) => {
                const value = e.target.value;
                setFilterActive(value === 'all' ? null : value === 'active');
              }}
              className="px-4 py-3 bg-input border border-border rounded-2xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="all">All Products</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Products Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {filteredProducts.length === 0 ? (
          <div className="zaago-card p-12 text-center">
            <Package className="w-16 h-16 text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchTerm || filterActive !== null ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-secondary mb-6">
              {searchTerm || filterActive !== null 
                ? 'Try adjusting your search or filters'
                : 'Start building your inventory by adding your first product'
              }
            </p>
            {!searchTerm && filterActive === null && (
              <Link to="/products/new">
                <button className="zaago-button-primary px-6 py-3 font-semibold">
                  Add Your First Product
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <ProductCard 
                  product={product} 
                  onDelete={handleDeleteProduct}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}