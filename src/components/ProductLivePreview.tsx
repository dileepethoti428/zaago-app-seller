import { Eye, ImageIcon, Package, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductLivePreviewProps {
  name: string;
  unit: string;
  basePrice: string;
  discountPercentage: string;
  stockQuantity: string;
  imagePreview?: string;
  tags: string[];
  isSubscribable: boolean;
}

export const ProductLivePreview = ({
  name,
  unit,
  basePrice,
  discountPercentage,
  stockQuantity,
  imagePreview,
  tags,
  isSubscribable,
}: ProductLivePreviewProps) => {
  const price = parseFloat(basePrice) || 0;
  const discount = parseFloat(discountPercentage) || 0;
  const stock = parseInt(stockQuantity) || 0;
  const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Eye className="w-4 h-4" />
        Live Preview — how customers will see this product
      </div>

      <div className="max-w-xs bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Image */}
        <div className="relative aspect-square bg-muted flex items-center justify-center">
          {imagePreview ? (
            <img src={imagePreview} alt={name || 'Product'} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
          )}
          {discount > 0 && price > 0 && (
            <Badge className="absolute top-2 left-2 bg-green-600 text-white">
              {discount}% OFF
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="p-3 space-y-1.5">
          <p className="font-medium text-sm text-foreground truncate">
            {name || 'Product Name'}
          </p>
          <p className="text-xs text-muted-foreground">{unit || 'Unit'}</p>

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">
              ₹{finalPrice > 0 ? finalPrice.toFixed(2) : '0.00'}
            </span>
            {discount > 0 && price > 0 && (
              <span className="text-sm text-muted-foreground line-through">
                ₹{price.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Package className="w-3 h-3" />
            {stock > 0 ? (
              <span className={stock <= 10 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                In stock ({stock})
              </span>
            ) : (
              <span className="text-destructive font-medium">Out of stock</span>
            )}
          </div>

          {isSubscribable && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <RefreshCw className="w-3 h-3" />
              Subscription available
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
