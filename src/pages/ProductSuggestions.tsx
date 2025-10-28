import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProductSuggestionForm } from '@/components/ProductSuggestionForm';
import { useProductSuggestions, ProductSuggestion } from '@/hooks/useProductSuggestions';
import { useAuth } from '@/context/AuthContext';
import { Lightbulb, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ProductSuggestions = () => {
  const { user } = useAuth();
  const { fetchUserSuggestions } = useProductSuggestions();
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user, filter]);

  const loadSuggestions = async () => {
    if (!user) return;
    
    const data = await fetchUserSuggestions(user.id);
    
    if (filter !== 'all') {
      setSuggestions(data.filter(s => s.status === filter));
    } else {
      setSuggestions(data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'reviewed': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  const getProductImage = (suggestion: ProductSuggestion) => {
    return suggestion.suggested_images?.[0] || suggestion.image_url;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">My Product Suggestions</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Suggestion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Suggest a Product</DialogTitle>
              </DialogHeader>
              <ProductSuggestionForm 
                onSuccess={() => {
                  setDialogOpen(false);
                  loadSuggestions();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {getProductImage(suggestion) && (
                    <img
                      src={getProductImage(suggestion)}
                      alt={suggestion.product_name}
                      className="w-24 h-24 object-cover rounded cursor-pointer"
                      onClick={() => setSelectedImage(getProductImage(suggestion)!)}
                    />
                  )}
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{suggestion.product_name}</h3>
                      <Badge className={getStatusColor(suggestion.status)}>
                        {suggestion.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                    
                    {suggestion.category && (
                      <p className="text-sm">
                        <strong>Category:</strong> {suggestion.category}
                      </p>
                    )}
                    
                    {suggestion.estimated_price_range && (
                      <p className="text-sm">
                        <strong>Price Range:</strong> {suggestion.estimated_price_range}
                      </p>
                    )}

                    {suggestion.suggested_images && suggestion.suggested_images.length > 1 && (
                      <div className="flex gap-2 flex-wrap pt-2">
                        {suggestion.suggested_images.slice(1).map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`${suggestion.product_name} ${idx + 2}`}
                            className="w-16 h-16 object-cover rounded cursor-pointer"
                            onClick={() => setSelectedImage(img)}
                          />
                        ))}
                      </div>
                    )}
                    
                    {suggestion.admin_notes && (
                      <div className="bg-muted p-3 rounded mt-2">
                        <p className="text-sm">
                          <strong>Admin Response:</strong> {suggestion.admin_notes}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Submitted on {new Date(suggestion.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {suggestions.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? "You haven't submitted any product suggestions yet."
                    : `No ${filter} suggestions found.`
                  }
                </p>
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="mt-4"
                >
                  Submit Your First Suggestion
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <img src={selectedImage || ''} alt="Full size" className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductSuggestions;
