import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { motion } from 'framer-motion';
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

const AddCategory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;
    const compressedImage = await compressImage(selectedImage);
    const fileName = `${Date.now()}-${selectedImage.name}`;
    const filePath = `category-images/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, compressedImage);
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: 'Please enter a category name', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadImage();
      const { error } = await supabase.from('categories').insert({
        seller_id: user?.id,
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
        is_active: true,
      } as any);
      if (error) throw error;
      toast({ title: 'Category created successfully!' });
      navigate('/categories');
    } catch (error: any) {
      toast({ title: 'Error creating category', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Category</h1>
          <p className="text-muted-foreground">Create a new category with custom styling</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Fresh Dairy" />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
                </div>
                <div>
                  <Label>Category Icon (Emoji)</Label>
                  <EmojiPicker value={formData.icon} onChange={(emoji) => setFormData({ ...formData, icon: emoji })} />
                </div>
                <div>
                  <Label>Category Image</Label>
                  {imagePreview ? (
                    <div className="relative w-32 h-32 mt-2">
                      <img src={imagePreview} alt="Category" className="w-full h-full object-cover rounded-lg" />
                      <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={removeImage}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-accent">
                        <Upload className="h-4 w-4" /><span>Upload Image</span>
                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input id="display_order" type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Styling Options</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Font Family</Label>
                    <Select value={formData.font_family} onValueChange={(value) => setFormData({ ...formData, font_family: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_FAMILIES.map((font) => (<SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Font Weight</Label>
                    <Select value={formData.font_weight} onValueChange={(value: 'normal' | 'medium' | 'bold') => setFormData({ ...formData, font_weight: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_WEIGHTS.map((w) => (<SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Font Size: {formData.font_size}px</Label>
                  <Input type="range" min={12} max={32} value={formData.font_size} onChange={(e) => setFormData({ ...formData, font_size: parseInt(e.target.value) })} className="mt-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Text Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={formData.text_color} onChange={(e) => setFormData({ ...formData, text_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={formData.text_color} onChange={(e) => setFormData({ ...formData, text_color: e.target.value })} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Background Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={formData.background_color} onChange={(e) => setFormData({ ...formData, background_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={formData.background_color} onChange={(e) => setFormData({ ...formData, background_color: e.target.value })} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.is_gradient} onCheckedChange={(checked) => setFormData({ ...formData, is_gradient: checked })} />
                    <Label>Use Gradient Background</Label>
                  </div>
                  {formData.is_gradient && (
                    <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary">
                      <div>
                        <Label>Gradient Start</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="color" value={formData.gradient_start_color} onChange={(e) => setFormData({ ...formData, gradient_start_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                          <Input value={formData.gradient_start_color} onChange={(e) => setFormData({ ...formData, gradient_start_color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                      <div>
                        <Label>Gradient End</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="color" value={formData.gradient_end_color} onChange={(e) => setFormData({ ...formData, gradient_end_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                          <Input value={formData.gradient_end_color} onChange={(e) => setFormData({ ...formData, gradient_end_color: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-6 space-y-6">
            <CategoryStylePreview name={formData.name} icon={formData.icon} fontFamily={formData.font_family} fontSize={formData.font_size} fontWeight={formData.font_weight} textColor={formData.text_color} backgroundColor={formData.background_color} isGradient={formData.is_gradient} gradientStartColor={formData.gradient_start_color} gradientEndColor={formData.gradient_end_color} />
            <Button type="submit" className="w-full" size="lg" disabled={!formData.name || isSubmitting}>
              <Save className="h-4 w-4 mr-2" />{isSubmitting ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default AddCategory;
