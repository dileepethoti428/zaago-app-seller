import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderTree, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/imageCompression';

const AddSubCategory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    image_url: '',
    sort_order: 0,
    is_active: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return null;

    setImageLoading(true);
    try {
      const compressedImage = await compressImage(selectedImage);
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `subcategory-images/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category_id) {
      toast({
        title: "Validation Error",
        description: "Please select a parent category",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Sub-category name is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedImage) {
      toast({
        title: "Validation Error",
        description: "Sub-category image is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadImage();
      if (!imageUrl) {
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('subcategories')
        .insert({
          category_id: formData.category_id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          image_url: imageUrl,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sub-category created successfully!",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating sub-category:', error);
      toast({
        title: "Error",
        description: "Failed to create sub-category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <FolderTree className="w-8 h-8 text-zaago-green" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add Sub-Category</h1>
          <p className="text-zaago-muted-foreground">Create a new product sub-category</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-zaago-card border-zaago-border">
          <CardHeader>
            <CardTitle className="text-foreground">Sub-Category Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parent Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">
                Parent Category <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger className="bg-zaago-card border-zaago-border text-foreground">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-zaago-card border-zaago-border">
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-foreground hover:bg-zaago-accent">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-Category Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Sub-Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Fresh Fruits"
                className="bg-zaago-card border-zaago-border text-foreground"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this sub-category..."
                className="bg-zaago-card border-zaago-border text-foreground min-h-[100px]"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-foreground">
                Sub-Category Image <span className="text-red-500">*</span>
              </Label>
              {!imagePreview ? (
                <div className="border-2 border-dashed border-zaago-border rounded-lg p-8 text-center hover:border-zaago-green/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-12 h-12 text-zaago-muted-foreground" />
                    <p className="text-foreground font-medium">Click to upload image</p>
                    <p className="text-zaago-muted-foreground text-sm">PNG, JPG up to 10MB</p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sort_order" className="text-foreground">
                Sort Order
              </Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="bg-zaago-card border-zaago-border text-foreground"
              />
              <p className="text-zaago-muted-foreground text-sm">Lower numbers appear first</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading || imageLoading}
                className="flex-1 bg-zaago-green hover:bg-zaago-green-light text-white"
              >
                {loading ? 'Creating...' : 'Create Sub-Category'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1 border-zaago-border text-foreground hover:bg-zaago-accent"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </motion.div>
  );
};

export default AddSubCategory;
