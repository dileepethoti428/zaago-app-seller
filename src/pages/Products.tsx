import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package2,
  Camera,
  Upload,
  X,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Check,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/imageCompression';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Products = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    image_url: '',
    is_active: true
  });

  useEffect(() => {
    if (!user) return;
    fetchProducts();

    const channel = supabase
      .channel(`products-realtime-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newProduct = payload.new as Product;
            setProducts(prev => [newProduct, ...prev]);
            
            toast({
              title: "Product Added! 🎉",
              description: `${newProduct.name} was added to your catalog`,
              duration: 5000
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedProduct = payload.new as Product;
            setProducts(prev => 
              prev.map(product => 
                product.id === updatedProduct.id ? updatedProduct : product
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(product => product.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to fetch products. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => 
        statusFilter === 'active' ? product.is_active : !product.is_active
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, statusFilter]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock_quantity: '',
      image_url: '',
      is_active: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to manage products.",
        variant: "destructive"
      });
      return;
    }

    const productData = {
      seller_id: user.id,
      name: formData.name,
      description: formData.description || null,
      base_price: parseFloat(formData.price),
      price: parseFloat(formData.price),
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      image_url: formData.image_url || null,
      is_active: formData.is_active
    };

    try {
      // Create new product only
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product created successfully!",
      });

      resetForm();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Note: handleEdit, handleDelete, and toggleProductStatus have been moved to ProductDetail.tsx

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingImage(true);
    try {
      const compressedFile = await compressImage(file);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedFile);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Calculate stats
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= 10 && p.stock_quantity > 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);

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
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Product Inventory
          </h1>
          <p className="text-zaago-muted-foreground text-sm sm:text-base">
            Manage your product catalog and inventory levels
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link to="/products/new">
            <Button className="bg-zaago-green hover:bg-zaago-green-light text-black font-medium">
              <Plus className="w-4 h-4 mr-2" />
              Add via Form
            </Button>
          </Link>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-zaago-border text-foreground hover:bg-zaago-accent">
                <Plus className="w-4 h-4 mr-2" />
                Quick Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zaago-card border-zaago-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Quick Add Product
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter product name"
                      required
                      className="bg-zaago-card border-zaago-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-foreground">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      required
                      className="bg-zaago-card border-zaago-border text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your product..."
                    rows={3}
                    className="bg-zaago-card border-zaago-border text-foreground"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-foreground">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      placeholder="0"
                      className="bg-zaago-card border-zaago-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-foreground">Product Image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="bg-zaago-card border-zaago-border text-foreground"
                    />
                    {uploadingImage && (
                      <p className="text-xs text-zaago-muted-foreground">Uploading image...</p>
                    )}
                  </div>
                </div>

                {formData.image_url && (
                  <div className="space-y-2">
                    <Label className="text-foreground">Image Preview</Label>
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-zaago-border">
                      <img
                        src={formData.image_url}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="active" className="text-foreground">Product is active</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="border-zaago-border text-foreground hover:bg-zaago-accent"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-zaago-green hover:bg-zaago-green-light text-black"
                  >
                    Add Product
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="overflow-x-auto -mx-3 px-3 pb-2"
      >
        <div className="flex gap-4 min-w-max">
        <Card className="min-w-[180px] flex-1 bg-zaago-card/50 border-zaago-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zaago-muted-foreground text-sm">Total Products</p>
                <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
              </div>
              <div className="p-3 bg-zaago-green/20 rounded-lg">
                <Package className="w-6 h-6 text-zaago-green" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[180px] flex-1 bg-zaago-card/50 border-zaago-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zaago-muted-foreground text-sm">Active Products</p>
                <p className="text-2xl font-bold text-foreground">{activeProducts}</p>
              </div>
              <div className="p-3 bg-zaago-green/20 rounded-lg">
                <Package2 className="w-6 h-6 text-zaago-green" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[180px] flex-1 bg-zaago-card/50 border-zaago-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zaago-muted-foreground text-sm">Low Stock Alert</p>
                <p className="text-2xl font-bold text-yellow-400">{lowStockProducts}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[180px] flex-1 bg-zaago-card/50 border-zaago-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zaago-muted-foreground text-sm">Total Value</p>
                <p className="text-2xl font-bold text-foreground">₹{totalValue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-zaago-green/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-zaago-green" />
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-zaago-card/50 border border-zaago-border rounded-xl p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zaago-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search products by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zaago-card border-zaago-border text-foreground placeholder:text-zaago-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-zaago-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-zaago-card border-zaago-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zaago-card border-zaago-border">
                <SelectItem value="all" className="text-foreground hover:bg-zaago-accent">All Products</SelectItem>
                <SelectItem value="active" className="text-foreground hover:bg-zaago-accent">Active Only</SelectItem>
                <SelectItem value="inactive" className="text-foreground hover:bg-zaago-accent">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Products List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="bg-zaago-card/50 border border-zaago-border rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-zaago-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Products ({filteredProducts.length})</h2>
            {filteredProducts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length}
              </p>
            )}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green"></div>
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
            <div className="grid gap-4">
              {filteredProducts.slice(0, visibleCount).map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="flex items-center gap-6 p-6 rounded-xl border border-zaago-border bg-zaago-card/30 hover:bg-zaago-accent/20 transition-all cursor-pointer group"
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-zaago-muted/10 flex-shrink-0 border border-zaago-border">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-zaago-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground text-xl leading-tight group-hover:text-zaago-green transition-colors">{product.name}</h3>
                      <span className="font-bold text-zaago-green text-xl">₹{product.price}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {product.stock_quantity <= 10 && product.stock_quantity > 0 && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-sm px-3 py-1">
                          Low Stock ({product.stock_quantity})
                        </Badge>
                      )}
                      {product.stock_quantity === 0 && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-sm px-3 py-1">
                          Out of Stock
                        </Badge>
                      )}
                      {product.stock_quantity > 10 && (
                        <Badge className="bg-zaago-green/20 text-zaago-green border-zaago-green/30 text-sm px-3 py-1">
                          In Stock ({product.stock_quantity})
                        </Badge>
                      )}
                      <Badge className={`text-sm px-3 py-1 ${product.is_active ? 'bg-zaago-green/20 text-zaago-green border-zaago-green/30' : 'bg-zaago-muted/20 text-zaago-muted-foreground border-zaago-muted/30'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  {/* Click Indicator */}
                  <div className="flex items-center flex-shrink-0">
                    <ChevronRight className="w-5 h-5 text-zaago-muted-foreground group-hover:text-zaago-green transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* View More / View Less */}
            {filteredProducts.length > visibleCount && (
              <div className="flex flex-col items-center gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="border-zaago-border text-foreground hover:bg-zaago-accent transition-all"
                >
                  View More ({filteredProducts.length - visibleCount} remaining)
                </Button>
              </div>
            )}
            {visibleCount > 5 && filteredProducts.length <= visibleCount && (
              <div className="flex flex-col items-center gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(5)}
                  className="border-zaago-border text-muted-foreground hover:bg-zaago-accent transition-all"
                >
                  View Less
                </Button>
              </div>
            )}
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-zaago-muted mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zaago-muted-foreground mb-2">No products found</h3>
              <p className="text-zaago-muted-foreground mb-6">
                {searchTerm || statusFilter !== 'all'
                  ? "No products match your search criteria."
                  : "Start by adding your first product to your inventory."}
              </p>
              <Link to="/products/new">
                <Button className="bg-zaago-green hover:bg-zaago-green-light text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Product
                </Button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Products;