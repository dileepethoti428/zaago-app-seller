import { motion } from 'framer-motion';
import { Edit, Save, Trash2, Tag, DollarSign, Package, Upload, Camera, X, Check, Plus, Minus } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity?: number;
  type?: string;
  unit: string;
  image_url?: string;
  discount_percentage?: number;
  benefits?: string[];
  ingredients?: string[];
  is_active: boolean;
  seller_id: string;
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    type: '',
    unit: 'per litre',
    image_url: '',
    discount_percentage: '',
    is_active: true,
    benefits: [''],
    ingredients: ['']
  });

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id || !user) return;

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
            description: "Product not found or you don't have permission to edit it.",
            variant: "destructive",
          });
          navigate('/products');
          return;
        }

        setProduct(data);
        setFormData({
          name: data.name || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          stock_quantity: data.stock_quantity?.toString() || '',
          type: data.type || '',
          unit: data.unit || 'per litre',
          image_url: data.image_url || '',
          discount_percentage: data.discount_percentage?.toString() || '',
          is_active: data.is_active,
          benefits: data.benefits && data.benefits.length > 0 ? data.benefits : [''],
          ingredients: data.ingredients && data.ingredients.length > 0 ? data.ingredients : ['']
        });
      } catch (error) {
        console.error('Unexpected error:', error);
        toast({
          title: "Error",
          description: "Failed to load product data.",
          variant: "destructive",
        });
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, user, navigate, toast]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'benefits' | 'ingredients', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'benefits' | 'ingredients') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'benefits' | 'ingredients', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Supabase Storage
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return formData.image_url || null;

    setImageUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload Failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
        return formData.image_url || null;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading the image.",
        variant: "destructive",
      });
      return formData.image_url || null;
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !user) return;

    setSaving(true);

    try {
      // Upload new image if one is selected, otherwise keep existing
      let imageUrl = formData.image_url;
      if (imageFile) {
        const uploadedImageUrl = await uploadImage();
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        }
      }

      // Filter out empty strings from arrays
      const benefits = formData.benefits.filter(b => b.trim() !== '');
      const ingredients = formData.ingredients.filter(i => i.trim() !== '');

      const updateData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        type: formData.type || null,
        unit: formData.unit,
        image_url: imageUrl || null,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : 0,
        benefits: benefits.length > 0 ? benefits : null,
        ingredients: ingredients.length > 0 ? ingredients : null,
        is_active: formData.is_active,
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id)
        .eq('seller_id', user.id);

      if (error) {
        console.error('Error updating product:', error);
        toast({
          title: "Update Failed",
          description: "Failed to update product. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product updated successfully!",
      });

      navigate('/products');
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !user) return;
    
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
        .eq('seller_id', user.id);

      if (error) {
        console.error('Error deleting product:', error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete product. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });

      navigate('/products');
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

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
            <p className="text-secondary">Loading product...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!product) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="zaago-card p-12 text-center">
          <Package className="w-16 h-16 text-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Product Not Found</h3>
          <p className="text-secondary mb-6">The product you're looking for doesn't exist or you don't have permission to edit it.</p>
          <Link to="/products">
            <button className="zaago-button-primary px-6 py-3 font-semibold">
              Back to Products
            </button>
          </Link>
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
            <p className="text-secondary mt-1">Update your product information</p>
          </div>
        </div>

        <button 
          onClick={handleDelete}
          className="zaago-button-ghost p-3 text-destructive hover:bg-destructive/10 transition-colors"
        >
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
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your product..."
                  rows={4}
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Product Type</label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    placeholder="e.g. Dairy, Organic"
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="per litre">Per Litre</option>
                    <option value="per kg">Per Kg</option>
                    <option value="per piece">Per Piece</option>
                    <option value="per bottle">Per Bottle</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) => handleInputChange('discount_percentage', e.target.value)}
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Product Image
                </label>
                
                {imagePreview || formData.image_url ? (
                  <div className="relative border-2 border-border rounded-2xl p-4">
                    <img
                      src={imagePreview || formData.image_url}
                      alt="Product preview"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer block">
                      <Upload className="w-12 h-12 text-secondary mx-auto mb-4" />
                      <p className="text-secondary mb-2">Drop image here or click to upload</p>
                      <p className="text-sm text-secondary">PNG, JPG up to 5MB</p>
                    </label>
                  </div>
                )}
              </div>

              {/* Alternative: Image URL Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Or paste image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              {/* Product Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Product Status</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.is_active === true}
                      onChange={() => handleInputChange('is_active', true)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      Active
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.is_active === false}
                      onChange={() => handleInputChange('is_active', false)}
                      className="text-secondary focus:ring-secondary"
                    />
                    <span className="flex items-center gap-2 text-sm">
                      <X className="w-4 h-4 text-secondary" />
                      Inactive
                    </span>
                  </label>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Benefits</label>
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => handleArrayChange('benefits', index, e.target.value)}
                      placeholder="Enter benefit"
                      className="flex-1 px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    {formData.benefits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('benefits', index)}
                        className="p-3 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('benefits')}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Benefit
                </button>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ingredients</label>
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={ingredient}
                      onChange={(e) => handleArrayChange('ingredients', index, e.target.value)}
                      placeholder="Enter ingredient"
                      className="flex-1 px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    {formData.ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('ingredients', index)}
                        className="p-3 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('ingredients')}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Ingredient
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border">
            <button
              type="submit"
              disabled={saving || imageUploading}
              className="zaago-button-primary px-8 py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {imageUploading ? 'Uploading Image...' : 'Saving Changes...'}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
            <Link to="/products">
              <button
                type="button"
                disabled={saving || imageUploading}
                className="zaago-button-ghost px-8 py-3 font-semibold w-full sm:w-auto disabled:opacity-50"
              >
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}