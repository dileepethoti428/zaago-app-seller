import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  AlertTriangle,
  Package,
  Camera,
  Calendar,
  DollarSign,
  Hash,
  FileText,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  image_url: string;
  is_active: boolean;
  category: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    image_url: '',
    is_active: true,
    category: 'food'
  });

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    if (!user?.id || !id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('seller_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        toast({
          title: "Error",
          description: "Failed to fetch product details. Please try again.",
          variant: "destructive"
        });
        navigate('/products');
        return;
      }

      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!product) return;
    
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      image_url: product.image_url || '',
      is_active: product.is_active,
      category: product.category || 'food'
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id || !product) {
      toast({
        title: "Error",
        description: "You must be logged in to edit products.",
        variant: "destructive"
      });
      return;
    }

    const productData = {
      seller_id: user.id,
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
      category: formData.category
    };

    try {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id)
        .eq('seller_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product updated successfully!",
      });

      setIsEditDialogOpen(false);
      fetchProduct(); // Refresh product data
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!user?.id || !product) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
        .eq('seller_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });
      
      navigate('/products');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleProductStatus = async () => {
    if (!user?.id || !product) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)
        .eq('seller_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Product ${!product.is_active ? 'activated' : 'deactivated'} successfully!`,
      });
      
      fetchProduct(); // Refresh product data
    } catch (error: any) {
      console.error('Error toggling product status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product status. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zaago-green"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-zaago-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-zaago-muted-foreground mb-2">Product not found</h3>
          <Link to="/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-4 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/products')}
          className="text-zaago-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>
      </div>

      {/* Product Details Card */}
      <Card className="bg-zaago-card/50 border-zaago-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-2xl text-foreground">{product.name}</CardTitle>
              <Badge className={`${
                product.is_active 
                  ? 'bg-zaago-green/20 text-zaago-green border-zaago-green/30' 
                  : 'bg-zaago-muted/20 text-zaago-muted-foreground border-zaago-muted/30'
              } text-sm font-medium px-3 py-1`}>
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="border-zaago-border text-zaago-muted-foreground hover:bg-zaago-accent hover:text-foreground"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Product
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleProductStatus}
                className="border-zaago-border text-zaago-muted-foreground hover:bg-zaago-accent hover:text-foreground"
              >
                {product.is_active ? <ToggleLeft className="w-4 h-4 mr-2" /> : <ToggleRight className="w-4 h-4 mr-2" />}
                {product.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zaago-card border-zaago-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Delete Product
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zaago-muted-foreground">
                      Are you sure you want to delete "<strong>{product.name}</strong>"? This action cannot be undone and will permanently remove the product from your catalog.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-zaago-border text-foreground hover:bg-zaago-accent">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Product Image */}
          {product.image_url && (
            <div className="w-full max-w-md mx-auto">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-64 object-cover rounded-lg border border-zaago-border"
              />
            </div>
          )}

          {/* Product Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zaago-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Price</span>
              </div>
              <p className="text-2xl font-bold text-zaago-green">₹{product.price}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zaago-muted-foreground">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm">Stock Quantity</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {product.stock_quantity} {product.stock_quantity === 1 ? 'item' : 'items'}
              </p>
              {product.stock_quantity <= 10 && product.stock_quantity > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                  Low Stock
                </Badge>
              )}
              {product.stock_quantity === 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                  Out of Stock
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zaago-muted-foreground">
                <Hash className="w-4 h-4" />
                <span className="text-sm">Category</span>
              </div>
              <p className="text-lg font-medium text-foreground capitalize">
                {product.category?.replace('_', ' ') || 'No category'}
              </p>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zaago-muted-foreground">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Description</span>
              </div>
              <p className="text-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zaago-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zaago-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Created</span>
              </div>
              <p className="text-sm text-foreground">
                {new Date(product.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zaago-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Last Updated</span>
              </div>
              <p className="text-sm text-foreground">
                {new Date(product.updated_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zaago-card border-zaago-border max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Product</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-zaago-input border-zaago-border text-foreground"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zaago-input border-zaago-border text-foreground"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="text-foreground">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="bg-zaago-input border-zaago-border text-foreground"
                  required
                />
              </div>

              <div>
                <Label htmlFor="stock_quantity" className="text-foreground">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                  className="bg-zaago-input border-zaago-border text-foreground"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category" className="text-foreground">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full h-10 px-3 py-2 bg-zaago-input border border-zaago-border rounded-md text-foreground focus:ring-2 focus:ring-zaago-green focus:border-zaago-green"
                required
              >
                <option value="food">Food</option>
                <option value="grocery">Grocery</option>
                <option value="frequently_bought">Frequently Bought</option>
                <option value="previously_bought">Previously Bought</option>
                <option value="fresh_milk_dairy">Fresh Milk & Dairy</option>
                <option value="grocery_kitchen">Grocery & Kitchen</option>
                <option value="beauty_personal_care">Beauty & Personal Care</option>
                <option value="household_essentials">Household Essentials</option>
              </select>
            </div>

            <div>
              <Label htmlFor="image_url" className="text-foreground">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                className="bg-zaago-input border-zaago-border text-foreground"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active" className="text-foreground">Product is active</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1 border-zaago-border text-foreground hover:bg-zaago-accent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-zaago-green text-black hover:bg-zaago-green-light"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ProductDetail;