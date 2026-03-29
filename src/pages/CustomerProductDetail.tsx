import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  ShoppingCart, 
  MapPin,
  Package,
  Share2,
  Flame
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/CartContext';
import { useActiveOffersNearby } from '@/hooks/useSpecialOffers';
import ProductVariantSelector from '@/components/ProductVariantSelector';
import { formatPriceWithGST, formatGSTBadge } from '@/utils/priceDisplay';
import { ProductTags } from '@/components/ProductTags';

interface ProductWithSeller {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_percentage: number;
  gst_percentage: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  seller_id: string;
  tags?: string[];
}

const CustomerProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<ProductWithSeller | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [finalPrice, setFinalPrice] = useState(0);
  const [sellerName, setSellerName] = useState('');

  // Get active offer for this product
  const { data: activeOffers = [] } = useActiveOffersNearby(product ? [product.id] : []);
  const activeOffer = activeOffers[0];

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, discount_percentage, 
          gst_percentage, stock_quantity, tags,
          image_url, is_active, seller_id, unit, type
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        toast({
          title: "Error",
          description: "Product not found or unavailable.",
          variant: "destructive"
        });
        navigate('/products-customer');
        return;
      }

      setProduct(data);
      setFinalPrice(data.price);
      
      // Fetch seller info separately
      if (data.seller_id) {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('name')
          .eq('id', data.seller_id)
          .single();
        
        if (sellerData) {
          setSellerName(sellerData.name);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      navigate('/products-customer');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  // Update final price when offer or product changes
  useEffect(() => {
    if (!product) return;
    
    if (activeOffer) {
      setFinalPrice(activeOffer.offer_price);
    } else if (product.discount_percentage > 0) {
      setFinalPrice(product.price * (1 - product.discount_percentage / 100));
    } else {
      setFinalPrice(product.price);
    }
  }, [product, activeOffer]);

  const handleVariantSelect = (variant: any, price: number) => {
    setSelectedVariant(variant);
    setFinalPrice(price);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    const productData = {
      id: product.id,
      name: product.name,
      price: selectedVariant?.price || product.price,
      image_url: product.image_url,
      seller_id: product.seller_id,
      stock_quantity: product.stock_quantity,
      discount_percentage: product.discount_percentage || 0
    };
    
    await addToCart(productData, 1, selectedVariant);
  };

  const toggleFavorite = () => {
    if (!product) return;
    
    toast({
      title: "Added to Favorites",
      description: `${product.name} has been added to your favorites`,
    });
  };

  const shareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Product link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Product not found</h3>
          <Button onClick={() => navigate('/products-customer')}>
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/products-customer')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="aspect-square w-full max-w-md mx-auto">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg border"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                <Package className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start gap-3">
              <h1 className="text-3xl font-bold mb-2 flex-1">{product.name}</h1>
              {activeOffer && (
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  {activeOffer.discount_percentage}% OFF
                </Badge>
              )}
            </div>
            {product.description && (
              <p className="text-muted-foreground text-lg">{product.description}</p>
            )}
            
            {/* Product Tags */}
            {product.tags && product.tags.length > 0 && (
              <ProductTags tags={product.tags} className="mt-3" />
            )}
            
            {activeOffer && (
              <p className="text-sm text-orange-500 mt-2">
                Offer expires {formatDistance(new Date(activeOffer.valid_until), new Date(), { addSuffix: true })}
              </p>
            )}
          </div>

          {/* Price with GST */}
          <div className="space-y-2">
            {activeOffer && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    ₹{activeOffer.offer_price.toFixed(2)}
                  </span>
                  <Badge variant="destructive" className="text-sm">
                    <Flame className="w-3 h-3 mr-1" />
                    Special Offer
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{product.price.toFixed(2)}
                  </span>
                </div>
                {product.gst_percentage > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Price includes GST ({product.gst_percentage}%)
                  </p>
                )}
              </>
            )}
            
            {!activeOffer && product.discount_percentage > 0 && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    ₹{finalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{product.price.toFixed(2)}
                  </span>
                  <Badge variant="secondary">
                    {product.discount_percentage}% OFF
                  </Badge>
                </div>
                {product.gst_percentage > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Price includes GST ({product.gst_percentage}%)
                  </p>
                )}
              </>
            )}
            
            {!activeOffer && !product.discount_percentage && (
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-bold text-primary">
                  ₹{product.price.toFixed(2)}
                </span>
                {product.gst_percentage > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Price includes GST ({product.gst_percentage}%)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Seller Info */}
          {sellerName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Sold by {sellerName}</span>
            </div>
          )}

          {/* Variant Selector */}
          <ProductVariantSelector
            productId={product.id}
            basePrice={product.price}
            onVariantSelect={handleVariantSelect}
            className="mb-4"
          />

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            <Badge variant={product.stock_quantity > 10 ? "default" : "secondary"}>
              {product.stock_quantity > 0 
                ? `${product.stock_quantity} in stock`
                : "Out of stock"
              }
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleAddToCart}
              disabled={product.stock_quantity === 0}
              className="flex-1"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
            
            <Button
              variant="outline"
              onClick={toggleFavorite}
              size="lg"
            >
              <Heart className="w-5 h-5" />
            </Button>
            
            <Button
              variant="outline"
              onClick={shareProduct}
              size="lg"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Product Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Original Price:</span>
                  <p className={`font-medium ${(activeOffer || product.discount_percentage > 0) ? 'line-through text-muted-foreground' : ''}`}>
                    ₹{product.price}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Price:</span>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-lg ${activeOffer ? 'text-orange-500' : 'text-primary'}`}>
                      ₹{finalPrice.toFixed(2)}
                    </p>
                    {activeOffer && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                        {activeOffer.discount_percentage}% off
                      </span>
                    )}
                    {!activeOffer && product.discount_percentage > 0 && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        {product.discount_percentage}% off
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedVariant && selectedVariant.price !== product.price && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Price difference:</span>
                  <p className={`font-medium ${
                    selectedVariant.price > product.price ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {selectedVariant.price > product.price ? '+' : ''}₹{(selectedVariant.price - product.price).toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default CustomerProductDetail;