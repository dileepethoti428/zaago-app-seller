import { useState, useEffect } from 'react';
import { Plus, Minus, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface VariantTemplate {
  id: string;
  template_name: string;
  template_value: string;
  sort_order: number;
}

interface ProductVariant {
  id?: string;
  variant_name: string;
  variant_value: string;
  price: number;
  stock_quantity: number;
  is_default: boolean;
  is_active: boolean;
}

interface ProductVariantsProps {
  selectedCategory: string;
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
}

export default function ProductVariants({ selectedCategory, variants, onVariantsChange }: ProductVariantsProps) {
  const [variantTemplates, setVariantTemplates] = useState<VariantTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedCategory) {
      fetchVariantTemplates();
    }
  }, [selectedCategory]);

  const fetchVariantTemplates = async () => {
    if (!selectedCategory) return;

    setLoading(true);
    try {
      // Map category names to template categories
      const templateCategory = getCategoryMapping(selectedCategory);
      
      const { data, error } = await supabase
        .from('variant_templates')
        .select('*')
        .eq('category_name', templateCategory)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setVariantTemplates(data || []);
    } catch (error) {
      console.error('Error fetching variant templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryMapping = (category: string): string => {
    const mappings: Record<string, string> = {
      'dairy': 'dairy',
      'fresh-milk-dairy': 'dairy',
      'beverages': 'beverages',
      'food': 'food',
      'grocery': 'grocery',
      'grocery-kitchen': 'grocery',
      'general': 'general'
    };
    return mappings[category] || 'general';
  };

  const addVariantFromTemplate = (template: VariantTemplate) => {
    const newVariant: ProductVariant = {
      variant_name: template.template_name,
      variant_value: template.template_value,
      price: 0,
      stock_quantity: 0,
      is_default: variants.length === 0,
      is_active: true
    };

    onVariantsChange([...variants, newVariant]);
  };

  const addCustomVariant = () => {
    const newVariant: ProductVariant = {
      variant_name: '',
      variant_value: '',
      price: 0,
      stock_quantity: 0,
      is_default: variants.length === 0,
      is_active: true
    };

    onVariantsChange([...variants, newVariant]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updatedVariants = variants.map((variant, i) => {
      if (i === index) {
        // If setting as default, unset others
        if (field === 'is_default' && value === true) {
          return { ...variant, [field]: value };
        }
        return { ...variant, [field]: value };
      } else if (field === 'is_default' && value === true) {
        return { ...variant, is_default: false };
      }
      return variant;
    });

    onVariantsChange(updatedVariants);
  };

  const removeVariant = (index: number) => {
    const updatedVariants = variants.filter((_, i) => i !== index);
    // If removed variant was default and there are other variants, make first one default
    if (variants[index].is_default && updatedVariants.length > 0) {
      updatedVariants[0].is_default = true;
    }
    onVariantsChange(updatedVariants);
  };

  if (!selectedCategory) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Package className="w-4 h-4" />
          Product Variants
        </label>
        <p className="text-sm text-muted-foreground">Please select a category first to see available size options.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Package className="w-4 h-4" />
        Product Variants (Optional)
      </label>
      
      {/* Quick Add Templates */}
      {variantTemplates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick add common sizes:</p>
          <div className="flex flex-wrap gap-2">
            {variantTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => addVariantFromTemplate(template)}
                className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {template.template_name} ({template.template_value})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Existing Variants */}
      {variants.map((variant, index) => (
        <div key={index} className="p-4 bg-card border border-border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Variant {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeVariant(index)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Variant Name</label>
              <input
                type="text"
                value={variant.variant_name}
                onChange={(e) => updateVariant(index, 'variant_name', e.target.value)}
                placeholder="e.g., Half Litre"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Value</label>
              <input
                type="text"
                value={variant.variant_value}
                onChange={(e) => updateVariant(index, 'variant_value', e.target.value)}
                placeholder="e.g., 500ml"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={variant.price}
                onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={variant.stock_quantity}
                onChange={(e) => updateVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={variant.is_default}
                onChange={(e) => updateVariant(index, 'is_default', e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
              />
              Default variant
            </label>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={variant.is_active}
                onChange={(e) => updateVariant(index, 'is_active', e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
              />
              Active
            </label>
          </div>
        </div>
      ))}

      {/* Add Custom Variant Button */}
      <button
        type="button"
        onClick={addCustomVariant}
        className="w-full py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Custom Variant
      </button>

      {variants.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: Set the actual price for each variant. This will be the final price customers pay.
        </p>
      )}
    </div>
  );
}
