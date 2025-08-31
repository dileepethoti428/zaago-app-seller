import { motion } from 'framer-motion';
import { Package, DollarSign, Calendar, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProductVariants } from '@/hooks/useProductVariants';
import ProductVariantSelector from './ProductVariantSelector';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  is_active: boolean;
  description?: string;
  stock_quantity?: number;
  created_at: string;
}

interface ProductCardProps {
  product: Product;
  onDelete?: (id: string) => void;
}

export default function ProductCard({ product, onDelete }: ProductCardProps) {
  const { variants } = useProductVariants(product.id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="zaago-card p-6 flex flex-col gap-4 hover:shadow-lg transition-all duration-300 group"
    >
      {/* Product Image */}
      <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-input">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-secondary">
            <Package className="w-16 h-16" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              product.is_active
                ? 'bg-primary text-primary-foreground'
                : 'bg-destructive text-destructive-foreground'
            }`}
          >
            {product.is_active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="flex-1 space-y-3">
        <h3 className="text-xl font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-secondary text-sm line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Variant Selector or Basic Price */}
        {variants.length > 0 ? (
          <ProductVariantSelector
            productId={product.id}
            basePrice={product.price}
            className="mb-2"
          />
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-primary">
              <span className="font-semibold">{formatPrice(product.price)}</span>
            </div>
            
            {product.stock_quantity !== undefined && (
              <div className="flex items-center gap-2 text-secondary">
                <Package className="w-4 h-4" />
                <span>{product.stock_quantity} in stock</span>
              </div>
            )}
          </div>
        )}

        {/* Stock info for products with variants */}
        {variants.length > 0 && product.stock_quantity !== undefined && (
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Package className="w-3 h-3" />
            <span>Base stock: {product.stock_quantity}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-secondary">
          <Calendar className="w-3 h-3" />
          <span>Created {formatDate(product.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Link
          to={`/products/${product.id}/edit`}
          className="flex-1 zaago-button-ghost py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </Link>
        
        {onDelete && (
          <button
            onClick={() => onDelete(product.id)}
            className="flex-1 zaago-button-ghost py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}