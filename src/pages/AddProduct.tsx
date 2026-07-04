import { motion } from 'framer-motion';
import { PlusCircle, Upload, Tag, DollarSign, Package, Plus, Minus, Camera, X, Check, Trash2, ChevronsUpDown, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import ProductVariants from '@/components/ProductVariants';
import { useSellerLocation } from '@/hooks/useSellerLocation';
import { useProductLocation } from '@/hooks/useProductLocation';
import { MapPin, Navigation, RefreshCw, AlertCircle, Loader } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TAG_CATEGORIES } from '@/config/productTags';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
    base_price: '',
    cost_price: '',
    stock_quantity: '',
    category_id: '',
    unit: 'per litre',
    image_url: '',
    discount_percentage: '',
    gst_percentage: '0',
    is_active: true,
    is_subscribable: false,
    benefits: [''],
    ingredients: [''],
    selectedTags: [] as string[]
  });
  
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  
  // Custom category and unit state
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [customTagName, setCustomTagName] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [tagsPickerOpen, setTagsPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; hasProducts: boolean } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

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

  const handleTagToggle = (tag: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedTags.includes(tag);
      return {
        ...prev,
        selectedTags: isSelected
          ? prev.selectedTags.filter(t => t !== tag)
          : [...prev.selectedTags, tag]
      };
    });
  };

  const clearAllTags = () => {
    setFormData(prev => ({ ...prev, selectedTags: [] }));
  };

  const handleAddCustomTag = () => {
    const trimmedTag = customTagName.trim();
    if (trimmedTag && !formData.selectedTags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, trimmedTag]
      }));
      setCustomTagName('');
      setShowCustomTagInput(false);
    }
  };

  // Fetch categories on mount - global categories + seller's own categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!user?.id) return;
      
      setLoadingCategories(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, image_url, seller_id')
          .eq('is_active', true)
          .eq('seller_id', user.id)
          .order('sort_order')
          .order('name');
        
        if (error) throw error;
        setCategories(data || []);
        setCategoriesError(null);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategoriesError('Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, [user?.id]);

  // Auto-show new category input if seller has no categories
  useEffect(() => {
    if (!loadingCategories && categories.length === 0) {
      setShowNewCategoryInput(true);
    }
  }, [loadingCategories, categories.length]);

  // Auto-calculate final price when base price or GST changes
  useEffect(() => {
    const basePrice = parseFloat(formData.base_price) || 0;
    const gst = parseFloat(formData.gst_percentage) || 0;
    
    const finalPrice = basePrice + (basePrice * gst / 100);
    setCalculatedPrice(finalPrice);
  }, [formData.base_price, formData.gst_percentage]);


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

    // Guard: ensure a sellers row exists for this user so products are never orphaned
    const { data: sellerRow, error: sellerCheckError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (sellerCheckError || !sellerRow) {
      toast({
        title: "Seller profile missing",
        description: "Your seller account is not fully set up. Please complete signup/KYC before adding products.",
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

      // Tags are optional — only save what the seller explicitly selected
      const finalTags: string[] = formData.selectedTags;

      // Handle custom category creation - private to this seller
      let finalCategoryId = formData.category_id;
      if (showNewCategoryInput && newCategoryName.trim()) {
        console.log('Creating category with seller_id:', user.id);
        
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert([{ 
            name: newCategoryName.trim(), 
            is_active: true,
            seller_id: user.id  // Must match auth.uid() for RLS
          }])
          .select()
          .single();
        
        if (categoryError) {
          console.error('Category creation error:', categoryError);
          toast({
            title: "Category Error",
            description: categoryError.message || "Failed to create new category. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        console.log('Category created successfully:', newCategory);
        finalCategoryId = newCategory.id;
      }

      // Validate that category is selected
      if (!finalCategoryId) {
        toast({
          title: "Category Required",
          description: "Please select or create a category for this product",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Handle custom unit
      const finalUnit = showCustomUnitInput && customUnit.trim() ? customUnit.trim() : formData.unit;

      // Validate cost price if provided
      let parsedCostPrice: number | null = null;
      if (formData.cost_price.trim() !== '') {
        const c = parseFloat(formData.cost_price);
        if (isNaN(c) || c < 0) {
          toast({
            title: "Invalid cost price",
            description: "Please enter a valid non-negative number for cost price.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        parsedCostPrice = c;
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        base_price: parseFloat(formData.base_price),
        price: calculatedPrice,
        cost_price: parsedCostPrice,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category_id: finalCategoryId,
        unit: finalUnit,
        image_url: allImages.length > 0 ? allImages[0] : null,
        images: allImages,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : 0,
        gst_percentage: formData.gst_percentage ? parseFloat(formData.gst_percentage) : 0,
        tags: finalTags,
        benefits: benefits.length > 0 ? benefits : null,
        ingredients: ingredients.length > 0 ? ingredients : null,
        is_active: formData.is_active,
        is_subscribable: formData.is_subscribable,
        seller_id: user?.id,
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
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', e.target.value)}
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Cost Price (Internal)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                <p className="text-xs text-muted-foreground">
                  Only visible to you. Price you paid at the source. Leave empty if not applicable.
                </p>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Select Category <span className="text-red-500">*</span>
                </label>
                
                {loadingCategories ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground bg-muted/50 rounded-lg">
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : categoriesError ? (
                  <div className="space-y-2">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{categoriesError}</AlertDescription>
                    </Alert>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Create your first category</p>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      className="w-full px-4 py-3 bg-card border border-primary rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                ) : (
                  <>
                    <Popover open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all flex items-center justify-between"
                        >
                          <span className={showNewCategoryInput || !formData.category_id ? 'text-muted-foreground' : ''}>
                            {showNewCategoryInput
                              ? '+ Other (Add New)'
                              : categories.find((c) => c.id === formData.category_id)?.name || 'Select a category'}
                          </span>
                          <ChevronsUpDown className="w-4 h-4 opacity-60 ml-2 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="p-1 w-[--radix-popover-trigger-width] max-h-72 overflow-y-auto bg-popover"
                      >
                        {categories.map((category) => {
                          const isSelected = formData.category_id === category.id && !showNewCategoryInput;
                          return (
                            <div
                              key={category.id}
                              className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-accent ${
                                isSelected ? 'bg-accent' : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setShowNewCategoryInput(false);
                                  setNewCategoryName('');
                                  handleInputChange('category_id', category.id);
                                  setCategoryPickerOpen(false);
                                }}
                                className="flex-1 text-left flex items-center gap-2 text-foreground"
                              >
                                {isSelected && <Check className="w-4 h-4 text-primary" />}
                                <span className="truncate">{category.name}</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Edit ${category.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategoryPickerOpen(false);
                                  navigate(`/categories/${category.id}/edit`);
                                }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${category.name}`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!user?.id) return;
                                  // Check products before opening dialog
                                  const { data: prods } = await supabase
                                    .from('products')
                                    .select('id')
                                    .eq('seller_id', user.id)
                                    .or(`category_id.eq.${category.id},category.eq.${category.name}`)
                                    .limit(1);
                                  setDeleteTarget({
                                    id: category.id,
                                    name: category.name,
                                    hasProducts: !!(prods && prods.length > 0),
                                  });
                                }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryInput(true);
                            handleInputChange('category_id', '');
                            setCategoryPickerOpen(false);
                          }}
                          className="w-full text-left rounded-md px-3 py-2 hover:bg-accent text-primary"
                        >
                          + Other (Add New)
                        </button>
                      </PopoverContent>
                    </Popover>

                    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                      <AlertDialogContent>
                        {deleteTarget?.hasProducts ? (
                          <>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cannot delete category</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{deleteTarget.name}" has products in it. Move or delete those products first, then try again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Close</AlertDialogCancel>
                            </AlertDialogFooter>
                          </>
                        ) : (
                          <>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={deletingCategory}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (!deleteTarget) return;
                                  setDeletingCategory(true);
                                  const { error } = await supabase
                                    .from('categories')
                                    .delete()
                                    .eq('id', deleteTarget.id);
                                  setDeletingCategory(false);
                                  if (error) {
                                    toast({
                                      title: 'Delete failed',
                                      description: error.message,
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
                                  if (formData.category_id === deleteTarget.id) {
                                    handleInputChange('category_id', '');
                                  }
                                  toast({ title: 'Category deleted' });
                                  setDeleteTarget(null);
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingCategory ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </>
                        )}
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    {showNewCategoryInput && (
                      <div className="mt-2">
                        <input
                          type="text"
                          required
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter new category name"
                          className="w-full px-4 py-3 bg-card border border-primary rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryName('');
                          }}
                          className="mt-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Unit Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unit</label>
                <select
                  value={showCustomUnitInput ? 'other' : formData.unit}
                  onChange={(e) => {
                    if (e.target.value === 'other') {
                      setShowCustomUnitInput(true);
                      handleInputChange('unit', '');
                    } else {
                      setShowCustomUnitInput(false);
                      setCustomUnit('');
                      handleInputChange('unit', e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="per litre">Per Litre</option>
                  <option value="500ml">500ml (Half Litre)</option>
                  <option value="per kg">Per Kg</option>
                  <option value="500g">500g (1/2 Kg)</option>
                  <option value="per piece">Per Piece</option>
                  <option value="per bottle">Per Bottle</option>
                  <option value="other">+ Other</option>
                </select>
                
                {showCustomUnitInput && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="Enter custom unit (e.g., per box, per dozen)"
                      className="w-full px-4 py-3 bg-card border border-primary rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomUnitInput(false);
                        setCustomUnit('');
                        handleInputChange('unit', 'per litre');
                      }}
                      className="mt-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                )}
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

                {/* Image Upload Guidelines */}
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground text-xs mb-2">📸 Image Upload Guidelines</p>
                  <div className="grid grid-cols-1 gap-1">
                    <span>📐 <strong>Aspect Ratio:</strong> 1:1 (Square)</span>
                    <span>📏 <strong>Recommended:</strong> 1000×1000 px &nbsp;|&nbsp; <strong>Minimum:</strong> 500×500 px</span>
                    <span>💾 <strong>Max File Size:</strong> 5 MB</span>
                    <span>🗂 <strong>Formats:</strong> JPG, JPEG, PNG only</span>
                    <span>🎯 Product should cover <strong>80–90%</strong> of frame</span>
                    <span>🚫 Avoid watermarks or text overlays</span>
                  </div>
                </div>
                
                {/* Image Upload Area */}
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground mb-2">Drop images here or click to upload</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG files up to 5MB each</p>
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
                {calculatedPrice > 0 && formData.discount_percentage && parseFloat(formData.discount_percentage) > 0 && (
                  <div className="flex items-center justify-between text-sm bg-muted/50 px-3 py-2 rounded-md">
                    <span className="text-muted-foreground">Final Price after Discount:</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground">₹{calculatedPrice.toFixed(2)}</span>
                      <span className="font-semibold text-green-600">
                        ₹{(calculatedPrice * (1 - parseFloat(formData.discount_percentage) / 100)).toFixed(2)}
                      </span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        {formData.discount_percentage}% off
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* GST Percentage */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  GST Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.gst_percentage}
                  onChange={(e) => handleInputChange('gst_percentage', e.target.value)}
                  placeholder="Enter GST % (e.g., 5, 12, 18)"
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                <p className="text-xs text-muted-foreground">
                  Common GST rates: 0%, 5%, 12%, 18%, 28%
                </p>
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

          {/* Product Tags Section */}
          <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Tag className="h-5 w-5 text-primary" />
                Product Tags
              </h2>
              {formData.selectedTags.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAllTags}
                >
                  Clear All ({formData.selectedTags.length})
                </Button>
              )}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Tags are optional.</strong> If you don't select any, your product will be shown without tags.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setTagsPickerOpen(true)}
              className="w-full justify-between"
            >
              <span className={formData.selectedTags.length === 0 ? 'text-muted-foreground' : ''}>
                {formData.selectedTags.length === 0
                  ? 'Select product tags'
                  : `${formData.selectedTags.length} tag${formData.selectedTags.length > 1 ? 's' : ''} selected`}
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>

            {formData.selectedTags.length > 0 && (
              <div className="pt-4 mt-4 border-t border-border">
                <p className="text-sm font-medium mb-2 text-foreground">
                  Selected Tags ({formData.selectedTags.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="px-3 py-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Dialog open={tagsPickerOpen} onOpenChange={setTagsPickerOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Select Product Tags</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                  {Object.entries(TAG_CATEGORIES).map(([categoryKey, category]) => (
                    <div key={categoryKey} className="space-y-3">
                      <h3 className="font-medium text-sm text-muted-foreground">
                        {category.label}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {category.tags.map((tag) => (
                          <div key={tag} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tag-${tag}`}
                              checked={formData.selectedTags.includes(tag)}
                              onCheckedChange={() => handleTagToggle(tag)}
                            />
                            <Label
                              htmlFor={`tag-${tag}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {tag}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="space-y-3 pt-4 border-t border-border">
                    <h3 className="font-medium text-sm text-muted-foreground">
                      Custom Tag
                    </h3>
                    {!showCustomTagInput ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomTagInput(true)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Other Tag
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customTagName}
                          onChange={(e) => setCustomTagName(e.target.value)}
                          placeholder="Enter custom tag name"
                          className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomTag();
                            }
                          }}
                          autoFocus
                        />
                        <Button type="button" size="sm" onClick={handleAddCustomTag}>
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowCustomTagInput(false);
                            setCustomTagName('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setTagsPickerOpen(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
              selectedCategory={categories.find(c => c.id === formData.category_id)?.name || ''}
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