import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ShoppingCart, Heart, MapPin, Flame, Package, Grid3X3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductsNearby } from "@/hooks/useProductsNearby";
import { useActiveOffersNearby } from "@/hooks/useSpecialOffers";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/CartContext";
import { formatDistance } from 'date-fns';

const ProductsCustomer = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [maxDistance, setMaxDistance] = useState(15);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { products, loading, error, customerLocation } = useProductsNearby(maxDistance);
  const { toast } = useToast();
  const { addToCart } = useCart();

  // Get product IDs for offers query
  const productIds = useMemo(() => products.map((p: any) => p.product_id), [products]);
  const { data: activeOffers = [] } = useActiveOffersNearby(productIds);

  // Create a map of product ID to active offer
  const offerMap = useMemo(() => {
    const map = new Map();
    activeOffers.forEach((offer: any) => {
      map.set(offer.product_id, offer);
    });
    return map;
  }, [activeOffers]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const uniqueCategories = new Map<string, string>();
    products.forEach((product: any) => {
      if (product.category_id && product.category_name) {
        uniqueCategories.set(product.category_id, product.category_name);
      }
    });
    return Array.from(uniqueCategories, ([id, name]) => ({ id, name }));
  }, [products]);

  // Get products with active offers for special section
  const productsWithOffers = useMemo(() => {
    return products.filter((p: any) => offerMap.has(p.product_id)).slice(0, 8);
  }, [products, offerMap]);

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.product_description && product.product_description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = async (product: any) => {
    const productData = {
      id: product.product_id,
      name: product.product_name,
      price: product.discounted_price || product.product_price,
      image_url: product.product_image_url,
      seller_id: product.seller_id,
      stock_quantity: product.stock_quantity,
      discount_percentage: product.discount_percentage || 0
    };
    
    await addToCart(productData);
  };

  const toggleFavorite = (product: any) => {
    toast({
      title: "Added to Favorites",
      description: `${product.product_name} has been added to your favorites`,
    });
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Location Required</h2>
          <p className="text-muted-foreground">
            Please enable location access to see products available in your area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header with location info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-3xl font-bold">Products Near You</h1>
        {customerLocation && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Showing products within {maxDistance}km of your location</span>
          </div>
        )}
      </motion.div>

      {/* Special Offers Section */}
      {productsWithOffers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 border border-orange-500/20 rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold">🔥 Special Offers & Deals</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {productsWithOffers.map((product: any) => {
              const offer = offerMap.get(product.product_id);
              if (!offer) return null;

              const timeUntilExpiry = formatDistance(new Date(offer.valid_until), new Date(), { addSuffix: true });

              return (
                <Link
                  key={product.product_id}
                  to={`/customer-products/${product.product_id}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg transition-all bg-card/80 backdrop-blur border-orange-500/30">
                    <CardHeader className="p-0 relative">
                      <div className="aspect-square w-full overflow-hidden rounded-t-lg relative">
                        {product.product_image_url ? (
                          <img
                            src={product.product_image_url}
                            alt={product.product_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600 text-white font-bold">
                          {offer.discount_percentage}% OFF
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{product.product_name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{offer.original_price.toFixed(2)}
                        </span>
                        <span className="text-xl font-bold text-orange-500">
                          ₹{offer.offer_price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expires {timeUntilExpiry}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Category Filter */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2"
        >
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="rounded-full"
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="rounded-full"
            >
              {category.name}
            </Button>
          ))}
        </motion.div>
      )}

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Range:</label>
          <select
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="border rounded px-3 py-1 text-sm bg-background text-foreground"
          >
            <option value={5}>5km</option>
            <option value={10}>10km</option>
            <option value={15}>15km</option>
            <option value={25}>25km</option>
          </select>
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg"></div>
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product: any) => {
            const offer = offerMap.get(product.product_id);
            const hasOffer = !!offer;

            return (
              <motion.div
                key={product.product_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full flex flex-col group hover:shadow-lg transition-all duration-300">
                  <Link to={`/customer-products/${product.product_id}`} className="block">
                    <div className="relative">
                      {product.product_image_url ? (
                        <img
                          src={product.product_image_url}
                          alt={product.product_name}
                          className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-48 bg-muted rounded-t-lg flex items-center justify-center">
                          <span className="text-muted-foreground">No image</span>
                        </div>
                      )}
                      {hasOffer && (
                        <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600 text-white">
                          {offer.discount_percentage}% OFF
                        </Badge>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(product);
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors z-10"
                      >
                        <Heart className="h-4 w-4" />
                      </button>
                    </div>
                  </Link>
                
                <CardContent className="flex-1 flex flex-col p-4">
                  <Link to={`/customer-products/${product.product_id}`} className="flex-1">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">{product.product_name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.product_description}
                      </p>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {product.distance_km.toFixed(1)}km away
                      </span>
                      {product.seller_location.city && (
                        <span className="text-xs text-muted-foreground">
                          • {product.seller_location.city}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {hasOffer ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-orange-500">
                                ₹{offer.offer_price.toFixed(2)}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                ₹{offer.original_price.toFixed(2)}
                              </span>
                            </div>
                          </>
                        ) : product.discount_percentage > 0 ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-primary">
                                ₹{product.discounted_price}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                ₹{product.original_price}
                              </span>
                            </div>
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded w-fit">
                              {product.discount_percentage}% off
                            </span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold text-primary">
                            ₹{product.product_price}
                          </span>
                        )}
                      </div>
                      <Badge variant={product.stock_quantity > 10 ? "default" : "secondary"}>
                        {product.stock_quantity} in stock
                      </Badge>
                    </div>
                    </div>
                  </Link>
                  
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      handleAddToCart(product);
                    }}
                    className="w-full mt-4"
                    disabled={product.stock_quantity === 0}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
            );
          })}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? "Try adjusting your search terms or increasing the distance range."
              : "No products are available in your area. Try increasing the distance range."
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductsCustomer;