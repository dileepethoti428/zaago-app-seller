import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import CategoryStylePreview from '@/components/CategoryStylePreview';
import EmojiPicker from '@/components/EmojiPicker';
import { compressImage } from '@/lib/imageCompression';

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
];

const FONT_WEIGHTS = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'bold', label: 'Bold' },
];

const EditCategory = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    font_family: 'Inter',
    font_size: 14,
    font_weight: 'normal' as 'normal' | 'medium' | 'bold',
    text_color: '#000000',
    background_color: '#FFFFFF',
    is_gradient: false,
    gradient_start_color: '#FF6B6B',
    gradient_end_color: '#FFE66D',
    display_order: 0,
    is_active: true,
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        icon: category.icon || '',
        font_family: category.font_family || 'Inter',
        font_size: category.font_size || 14,
        font_weight: (category.font_weight as 'normal' | 'medium' | 'bold') || 'normal',
        text_color: category.text_color || '#000000',
        background_color: category.background_color || '#FFFFFF',
        is_gradient: category.is_gradient || false,
        gradient_start_color: category.gradient_start_color || '#FF6B6B',
        gradient_end_color: category.gradient_end_color || '#FFE66D',
        display_order: category.display_order || 0,
        is_active: category.is_active ?? true,
      });
      setExistingImageUrl(category.image_url);
    }
  }, [category]);

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

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return existingImageUrl;

    const compressedImage = await compressImage(selectedImage);
    const fileName = `${Date.now()}-${selectedImage.name}`;
    const filePath = `category-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressedImage);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const imageUrl = await uploadImage();

      const { error } = await supabase
        .from('categories')
        .update({
          name: formData.name,
          description: formData.description,
          image_url: imageUrl,
          icon: formData.icon,
          font_family: formData.font_family,
          font_size: formData.font_size,
          font_weight: formData.font_weight,
          text_color: formData.text_color,
          background_color: formData.background_color,
          is_gradient: formData.is_gradient,
          gradient_start_color: formData.is_gradient ? formData.gradient_start_color : null,
          gradient_end_color: formData.is_gradient ? formData.gradient_end_color : null,
          display_order: formData.display_order,
          is_active: formData.is_active,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', id] });
      toast({ title: 'Category updated successfully!' });
      navigate('/categories');
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Category</h1>
          <p className="text-muted-foreground">Update category details and styling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Fresh Dairy"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this category"
                />
              </div>

              <div>
                <Label>Category Icon (Emoji)</Label>
                <EmojiPicker
                  value={formData.icon}
                  onChange={(emoji) => setFormData({ ...formData, icon: emoji })}
                />
              </div>

              <div>
                <Label>Category Image</Label>
                {(imagePreview || existingImageUrl) ? (
                  <div className="relative w-32 h-32 mt-2">
                    <img
                      src={imagePreview || existingImageUrl || ''}
                      alt="Category"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </CardContent>
          </Card>

          {/* Styling Options */}
          <Card>
            <CardHeader>
              <CardTitle>Styling Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Font Family</Label>
                  <Select
                    value={formData.font_family}
                    onValueChange={(value) => setFormData({ ...formData, font_family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Font Weight</Label>
                  <Select
                    value={formData.font_weight}
                    onValueChange={(value: 'normal' | 'medium' | 'bold') =>
                      setFormData({ ...formData, font_weight: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHTS.map((weight) => (
                        <SelectItem key={weight.value} value={weight.value}>
                          {weight.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Font Size: {formData.font_size}px</Label>
                <Input
                  type="range"
                  min={12}
                  max={32}
                  value={formData.font_size}
                  onChange={(e) => setFormData({ ...formData, font_size: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Text Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Background Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.background_color}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_gradient}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_gradient: checked })}
                  />
                  <Label>Use Gradient Background</Label>
                </div>

                {formData.is_gradient && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary">
                    <div>
                      <Label>Gradient Start</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={formData.gradient_start_color}
                          onChange={(e) =>
                            setFormData({ ...formData, gradient_start_color: e.target.value })
                          }
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={formData.gradient_start_color}
                          onChange={(e) =>
                            setFormData({ ...formData, gradient_start_color: e.target.value })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Gradient End</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={formData.gradient_end_color}
                          onChange={(e) =>
                            setFormData({ ...formData, gradient_end_color: e.target.value })
                          }
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={formData.gradient_end_color}
                          onChange={(e) =>
                            setFormData({ ...formData, gradient_end_color: e.target.value })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="lg:sticky lg:top-6 space-y-6">
          <CategoryStylePreview
            name={formData.name}
            icon={formData.icon}
            fontFamily={formData.font_family}
            fontSize={formData.font_size}
            fontWeight={formData.font_weight}
            textColor={formData.text_color}
            backgroundColor={formData.background_color}
            isGradient={formData.is_gradient}
            gradientStartColor={formData.gradient_start_color}
            gradientEndColor={formData.gradient_end_color}
          />

          <Button
            className="w-full"
            size="lg"
            onClick={() => updateMutation.mutate()}
            disabled={!formData.name || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditCategory;
