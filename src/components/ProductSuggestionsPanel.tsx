import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useProductSuggestions, ProductSuggestion } from '@/hooks/useProductSuggestions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Eye, Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';

export const ProductSuggestionsPanel = () => {
  const { user } = useAuth();
  const { fetchAllSuggestions, updateSuggestionStatus, loading } = useProductSuggestions();
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [filter, setFilter] = useState('pending');
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProductSuggestion | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, [filter, user]);

  const loadSuggestions = async () => {
    if (!user) return;
    
    // Both admins and sellers see all suggestions
    const data = await fetchAllSuggestions(filter);
    setSuggestions(data);
  };

  const handleStatusUpdate = async (
    id: string,
    status: 'approved' | 'rejected' | 'reviewed'
  ) => {
    const success = await updateSuggestionStatus(id, status, adminNotes);
    if (success) {
      setAdminNotes('');
      setSelectedSuggestion(null);
      loadSuggestions();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Product Suggestions</h2>
        </div>
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
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{suggestion.product_name}</CardTitle>
                    <Badge className={getStatusColor(suggestion.status)}>
                      {suggestion.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {new Date(suggestion.created_at).toLocaleDateString()}
                    {suggestion.customer_location?.city && (
                      <span className="ml-2">• {suggestion.customer_location.city}</span>
                    )}
                  </CardDescription>
                </div>
                {getProductImage(suggestion) && (
                  <img
                    src={getProductImage(suggestion)}
                    alt={suggestion.product_name}
                    className="w-20 h-20 object-cover rounded cursor-pointer"
                    onClick={() => setSelectedImage(getProductImage(suggestion)!)}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{suggestion.description}</p>
              
              {suggestion.category && (
                <p className="text-sm text-muted-foreground">
                  <strong>Category:</strong> {suggestion.category}
                </p>
              )}
              
              {suggestion.estimated_price_range && (
                <p className="text-sm text-muted-foreground">
                  <strong>Price Range:</strong> {suggestion.estimated_price_range}
                </p>
              )}
              
              {suggestion.additional_notes && (
                <p className="text-sm text-muted-foreground">
                  <strong>Notes:</strong> {suggestion.additional_notes}
                </p>
              )}

              {suggestion.suggested_images && suggestion.suggested_images.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {suggestion.suggested_images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${suggestion.product_name} ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded cursor-pointer"
                      onClick={() => setSelectedImage(img)}
                    />
                  ))}
                </div>
              )}

              {suggestion.admin_notes && (
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm"><strong>Admin Notes:</strong> {suggestion.admin_notes}</p>
                </div>
              )}

              {suggestion.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => setSelectedSuggestion(suggestion)}
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(suggestion.id, 'approved')}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusUpdate(suggestion.id, 'rejected')}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {suggestions.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No suggestions found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Suggestion</DialogTitle>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{selectedSuggestion.product_name}</p>
                <p className="text-sm text-muted-foreground">{selectedSuggestion.description}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for the customer..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleStatusUpdate(selectedSuggestion.id, 'approved')}
                  disabled={loading}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleStatusUpdate(selectedSuggestion.id, 'rejected')}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <img src={selectedImage || ''} alt="Full size" className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );
};
