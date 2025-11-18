import { motion } from 'framer-motion';
import { PlusCircle, Upload, Tag, DollarSign, Package, Plus, Minus, Camera, X, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import ProductVariants from '@/components/ProductVariants';
import { useSellerLocation } from '@/hooks/useSellerLocation';
import { useProductLocation } from '@/hooks/useProductLocation';
import { MapPin, Navigation, RefreshCw, AlertCircle, Loader } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';

export default function AddProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { sellerLocation, updateLocationFromCurrent, loading: locationLoading } = useSellerLocation();
  const [imageUploading, setImageUploading] = useState(false);
  
  // Product GPS location detection
  const { 
    location: productLocation, 
    loading: locationDetecting, 
    error: locationError,
    detectLocation,
    reDetectLocation 
  } = useProductLocation();

  // Auto-detect location on page load
  useEffect(() => {
    detectLocation();
  }, []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    type: '',
    category: '',
    customCategory: '',
    unit: 'per litre',
    image_url: '',
    discount_percentage: '',
    is_active: true,
    benefits: [''],
    ingredients: ['']
  });

  const [productVariants, setProductVariants] = useState<Array<{
    id?: string;
    variant_name: string;
    variant_value: string;
    price: number;
    discount_percentage: number;
    stock_quantity: number;
    is_default: boolean;
    is_active: boolean;
  }>>([]);

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

  // Handle multiple image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selectedFiles = Array.from(files);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    selectedFiles.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB. Please select smaller images.`,
          variant: "destructive",
        });
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    setImageFiles(prev => [...prev, ...validFiles]);

    // Create previews for new files
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreviews(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload multiple images to Supabase Storage
  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0 || !user) return [];

    setImageUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of imageFiles) {
        const compressedFile = await compressImage(file);
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, compressedFile);

        if (uploadError) {
          console.error('Upload error for file:', file.name, uploadError);
          continue; // Skip this file and continue with others
        }

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl);
        }
      }

      if (uploadedUrls.length === 0 && imageFiles.length > 0) {
        toast({
          title: "Upload Failed",
          description: "Failed to upload images. Please try again.",
          variant: "destructive",
        });
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading images.",
        variant: "destructive",
      });
      return [];
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add products",
        variant: "destructive",
      });
      return;
    }

    // Check if GPS location is detected
    if (!productLocation.latitude || !productLocation.longitude) {
      toast({
        title: "Location Required",
        description: "Please detect GPS location before adding product",
        variant: "destructive",
      });
      return;
    }
    
    // Check if seller location is verified ONLY if they have no products yet
    if (!sellerLocation?.location_verified) {
      // Check if this is their first product
      const { count: existingProductsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user?.id);
      
      // Only allow location update if no products exist
      if (!existingProductsCount || existingProductsCount === 0) {
        const updateSuccess = await updateLocationFromCurrent();
        if (!updateSuccess) {
          toast({
            title: "Location Required",
            description: "Please update your business location to add your first product.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    setLoading(true);

    try {
      // Upload all images
      const uploadedImageUrls = await uploadImages();
      
      // Combine uploaded images with any URL from input field
      const allImages = [...uploadedImageUrls];
      if (formData.image_url.trim()) {
        allImages.push(formData.image_url.trim());
      }

      // Filter out empty strings from arrays
      const benefits = formData.benefits.filter(b => b.trim() !== '');
      const ingredients = formData.ingredients.filter(i => i.trim() !== '');

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        type: formData.type || null,
        category: formData.category === 'other' ? formData.customCategory : formData.category,
        unit: formData.unit,
        image_url: allImages.length > 0 ? allImages[0] : null, // Keep backward compatibility
        images: allImages,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : 0,
        benefits: benefits.length > 0 ? benefits : null,
        ingredients: ingredients.length > 0 ? ingredients : null,
        is_active: formData.is_active,
        seller_id: user?.id, // Add seller_id to track ownership
        // GPS coordinates
        product_lat: productLocation.latitude,
        product_lng: productLocation.longitude,
      };

      const { data: product, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        console.error('Error creating product:', error);
        toast({
          title: "Error",
          description: "Failed to create product. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create product variants if any
      if (productVariants.length > 0 && product) {
        const variantData = productVariants.map(variant => ({
          product_id: product.id,
          variant_name: variant.variant_name,
          variant_value: variant.variant_value,
          price: variant.price,
          discount_percentage: variant.discount_percentage,
          stock_quantity: variant.stock_quantity,
          is_default: variant.is_default,
          is_active: variant.is_active
        }));

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (variantError) {
          console.error('Error creating variants:', variantError);
          toast({
            title: "Warning",
            description: "Product created but some variants failed to save.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: "Product created successfully!",
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            Add New Product
          </h1>
          <p className="text-muted-foreground">Create a new product listing for the customer app</p>
          
          {/* Location Status */}
          {sellerLocation && (
            <div className="mt-4 p-3 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Business Location:</span>
                {sellerLocation.location_verified ? (
                  <span className="text-green-600">✓ Verified</span>
                ) : (
                  <span className="text-orange-600">⚠ Not verified</span>
                )}
              </div>
              {!sellerLocation.location_verified && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={updateLocationFromCurrent}
                    disabled={locationLoading}
                    className="text-sm bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {locationLoading ? (
                      <>
                        <Navigation className="w-3 h-3 animate-spin inline mr-1" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3 inline mr-1" />
                        Update Location
                      </>
                    )}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Location is required to show your products to nearby customers
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form */}
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
                  placeholder="Enter product name"
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your product..."
                  rows={4}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
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
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
                    placeholder="0"
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                   <option value="">Select a category</option>
                   <option value="food">Food</option>
                   <option value="grocery">Grocery</option>
                   <option value="frequently-bought">Frequently Bought</option>
                   <option value="previously-bought">Previously Bought</option>
                   <option value="fresh-milk-dairy">Fresh Milk and Dairy</option>
                   <option value="grocery-kitchen">Grocery and Kitchen</option>
                   <option value="beauty-personal-care">Beauty and Personal Care</option>
                   <option value="household-essentials">Household Essentials</option>
                   <option value="special-offers-deals">Special Offers and Deals</option>
                   <option value="other">Other (Custom)</option>
                </select>
              </div>

              {/* Custom Category Input */}
              {formData.category === 'other' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Category Name/Type</label>
                  <input
                    type="text"
                    value={formData.customCategory}
                    onChange={(e) => handleInputChange('customCategory', e.target.value)}
                    placeholder="Enter category name or type (e.g., Electronics, Books, etc.)"
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Product Type</label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    placeholder="e.g. Dairy, Organic"
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="per litre">Per Litre</option>
                    <option value="500ml">500ml (Half Litre)</option>
                    <option value="per kg">Per Kg</option>
                    <option value="500g">500g (1/2 Kg)</option>
                    <option value="per piece">Per Piece</option>
                    <option value="per bottle">Per Bottle</option>
                  </select>
                </div>
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
                
                {/* Image Upload Area */}
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground mb-2">Drop images here or click to upload</p>
                    <p className="text-sm text-muted-foreground">Multiple PNG, JPG files up to 5MB each</p>
                  </label>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Product preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Image URL Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Or paste image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              {/* Product Status */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Product Status</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="radio"
                        name="status"
                        checked={formData.is_active === true}
                        onChange={() => handleInputChange('is_active', true)}
                        className="w-4 h-4 text-primary border-border focus:ring-primary focus:ring-2"
                      />
                      {formData.is_active === true && (
                        <Check className="w-3 h-3 text-primary absolute top-0.5 left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="radio"
                        name="status"
                        checked={formData.is_active === false}
                        onChange={() => handleInputChange('is_active', false)}
                        className="w-4 h-4 text-muted-foreground border-border focus:ring-primary focus:ring-2"
                      />
                      {formData.is_active === false && (
                        <X className="w-3 h-3 text-muted-foreground absolute top-0.5 left-0.5 pointer-events-none" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">Inactive</span>
                  </label>
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
                  placeholder="0"
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                
                {/* Show discounted price calculation */}
                {formData.price && formData.discount_percentage && parseFloat(formData.discount_percentage) > 0 && (
                  <div className="flex items-center justify-between text-sm bg-muted/50 px-3 py-2 rounded-md">
                    <span className="text-muted-foreground">Final Price:</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground">₹{parseFloat(formData.price).toFixed(2)}</span>
                      <span className="font-semibold text-green-600">
                        ₹{(parseFloat(formData.price) * (1 - parseFloat(formData.discount_percentage) / 100)).toFixed(2)}
                      </span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        {formData.discount_percentage}% off
                      </span>
                    </div>
                  </div>
                )}
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
                      className="flex-1 px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    {formData.benefits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('benefits', index)}
                        className="p-3 text-destructive hover:text-destructive/80 transition-colors"
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
                      className="flex-1 px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    {formData.ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('ingredients', index)}
                        className="p-3 text-destructive hover:text-destructive/80 transition-colors"
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

          {/* Product Exact Location (GPS) Section */}
          <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Navigation className="h-5 w-5 text-primary" />
              Product Exact Location (GPS)
            </h2>
            
            {/* Loading State */}
            {locationDetecting && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Detecting GPS location...</span>
              </div>
            )}
            
            {/* Error State */}
            {locationError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            )}
            
            {/* Detected Location Display */}
            {productLocation.latitude && productLocation.longitude && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Location Detected</span>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Latitude:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {productLocation.latitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Longitude:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {productLocation.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={reDetectLocation}
                  disabled={locationDetecting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${locationDetecting ? 'animate-spin' : ''}`} />
                  Re-detect Location
                </button>
              </div>
            )}
            
            {/* Initial Detection Button */}
            {!productLocation.latitude && !locationDetecting && (
              <button 
                type="button"
                onClick={detectLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Navigation className="h-4 w-4" />
                Detect Current Location
              </button>
            )}
            
            <p className="text-xs text-muted-foreground mt-3">
              This location will be used to show your product to nearby customers
            </p>
          </div>

          {/* Product Variants Section */}
          <div className="space-y-6">
            <ProductVariants
              selectedCategory={formData.category}
              variants={productVariants}
              onVariantsChange={setProductVariants}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-8">
            <button
              type="submit"
              disabled={loading || imageUploading || locationDetecting}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading || imageUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  {imageUploading ? 'Uploading Images...' : 'Creating Product...'}
                </>
              ) : (
                'Create Product'
              )}
            </button>
            <Link to="/products">
              <button
                type="button"
                disabled={loading || imageUploading || locationDetecting}
                className="bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}