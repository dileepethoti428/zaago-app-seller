import { motion } from 'framer-motion';
import { PlusCircle, Upload, Tag, DollarSign, Package, Plus, Minus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function AddProductPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    type: '',
    unit: 'per litre',
    image_url: '',
    discount_percentage: '',
    benefits: [''],
    ingredients: ['']
  });

  const handleInputChange = (field: string, value: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out empty strings from arrays
      const benefits = formData.benefits.filter(b => b.trim() !== '');
      const ingredients = formData.ingredients.filter(i => i.trim() !== '');

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        type: formData.type || null,
        unit: formData.unit,
        image_url: formData.image_url || null,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : 0,
        benefits: benefits.length > 0 ? benefits : null,
        ingredients: ingredients.length > 0 ? ingredients : null,
        is_active: true
      };

      const { data, error } = await supabase
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
        className="flex items-center gap-4"
      >
        <Link to="/products" className="zaago-button-ghost p-2">
          ←
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <PlusCircle className="w-8 h-8 text-primary" />
            Add New Product
          </h1>
          <p className="text-secondary mt-1">Create a new product listing for the customer app</p>
        </div>
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
                  placeholder="Enter product name"
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
                    placeholder="0.00"
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
                    placeholder="0"
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
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
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
                  className="w-full px-4 py-3 bg-input border border-border rounded-2xl text-foreground placeholder:text-secondary focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
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
              disabled={loading}
              className="zaago-button-primary px-8 py-3 font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
            <Link to="/products">
              <button
                type="button"
                className="zaago-button-ghost px-8 py-3 font-semibold w-full sm:w-auto"
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