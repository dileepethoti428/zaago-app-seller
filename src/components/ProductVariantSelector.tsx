import { useState, useEffect } from 'react';
import { Package, ChevronDown } from 'lucide-react';
import { useProductVariants } from '@/hooks/useProductVariants';

interface ProductVariantSelectorProps {
  productId: string;
  basePrice: number;
  onVariantSelect?: (variant: any, finalPrice: number) => void;
  className?: string;
}

export default function ProductVariantSelector({ 
  productId, 
  basePrice, 
  onVariantSelect,
  className = "" 
}: ProductVariantSelectorProps) {
  const { variants, loading, getDefaultVariant, getVariantPrice } = useProductVariants(productId);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      const defaultVariant = getDefaultVariant();
      setSelectedVariant(defaultVariant);
      if (defaultVariant && onVariantSelect) {
        onVariantSelect(defaultVariant, getVariantPrice(basePrice, defaultVariant));
      }
    }
  }, [variants, selectedVariant, basePrice, onVariantSelect, getDefaultVariant, getVariantPrice]);

  const handleVariantSelect = (variant: any) => {
    setSelectedVariant(variant);
    setIsOpen(false);
    if (onVariantSelect) {
      onVariantSelect(variant, getVariantPrice(basePrice, variant));
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Package className="w-4 h-4" />
        <span>Loading variants...</span>
      </div>
    );
  }

  if (variants.length === 0) {
    return null;
  }

  const finalPrice = getVariantPrice(basePrice, selectedVariant);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-card border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          <span>
            {selectedVariant ? selectedVariant.variant_name : 'Select size'}
            {selectedVariant && (
              <span className="ml-1 text-muted-foreground">
                ({selectedVariant.variant_value})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">₹{finalPrice.toFixed(2)}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {variants.map((variant) => {
            const variantPrice = getVariantPrice(basePrice, variant);
            const isSelected = selectedVariant?.id === variant.id;
            
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => handleVariantSelect(variant)}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center justify-between ${
                  isSelected ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{variant.variant_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {variant.variant_value}
                    {variant.stock_quantity > 0 
                      ? ` • ${variant.stock_quantity} in stock`
                      : ' • Out of stock'
                    }
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-medium">₹{variantPrice.toFixed(2)}</span>
                  {variantPrice !== basePrice && (
                    <span className={`text-xs ${
                      variantPrice > basePrice ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {variantPrice > basePrice ? '+' : ''}₹{(variantPrice - basePrice).toFixed(2)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}