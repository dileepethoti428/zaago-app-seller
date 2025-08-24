import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ShoppingCart, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductsWithLocation } from "@/hooks/useProductsWithLocation";
import { useToast } from "@/hooks/use-toast";

const ProductsCustomer = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [maxDistance, setMaxDistance] = useState(15);
  const { products, loading, error, customerLocation } = useProductsWithLocation(maxDistance);
  const { toast } = useToast();

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: any) => {
    toast({
      title: "Added to Cart",
      description: `${product.product_name} has been added to your cart`,
    });
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
            className="border rounded px-3 py-1 text-sm"
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
          {filteredProducts.map((product) => (
            <motion.div
              key={product.product_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full flex flex-col">
                <div className="relative">
                  {product.product_image_url ? (
                    <img
                      src={product.product_image_url}
                      alt={product.product_name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-t-lg flex items-center justify-center">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                  <button
                    onClick={() => toggleFavorite(product)}
                    className="absolute top-2 right-2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
                
                <CardContent className="flex-1 flex flex-col p-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-2">{product.product_name}</h3>
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
                      <span className="text-2xl font-bold text-primary">
                        ₹{product.product_price}
                      </span>
                      <Badge variant={product.stock_quantity > 10 ? "default" : "secondary"}>
                        {product.stock_quantity} in stock
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => addToCart(product)}
                    className="w-full mt-4"
                    disabled={product.stock_quantity === 0}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
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