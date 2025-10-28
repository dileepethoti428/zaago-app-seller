import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductSuggestions } from '@/hooks/useProductSuggestions';
import { useAuth } from '@/context/AuthContext';
import { Lightbulb, Upload, X, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLocation } from '@/hooks/useLocation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductSuggestionFormProps {
  onSuccess?: () => void;
}

export const ProductSuggestionForm = ({ onSuccess }: ProductSuggestionFormProps) => {
  const { user } = useAuth();
  const { submitSuggestion, loading } = useProductSuggestions();
  const { location, loading: locationLoading, error: locationError, getCurrentLocation } = useLocation();
  
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [locationAttempts, setLocationAttempts] = useState(0);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  // Confirm location when we have valid coordinates
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      console.log('✅ Location confirmed:', location);
      setLocationConfirmed(true);
    }
  }, [location]);

  // Auto-retry location fetch up to 3 times
  useEffect(() => {
    if (!locationConfirmed && locationAttempts < 3 && !locationLoading) {
      console.log(`🔄 Attempting to get location (attempt ${locationAttempts + 1}/3)`);
      getCurrentLocation(true);
      setLocationAttempts(prev => prev + 1);
    } else if (locationAttempts >= 3 && !locationConfirmed) {
      console.error('❌ Failed to get location after 3 attempts');
    }
  }, [locationConfirmed, locationAttempts, locationLoading, getCurrentLocation]);

  const handleRetryLocation = () => {
    console.log('🔄 Manual location retry');
    setLocationAttempts(0);
    setLocationConfirmed(false);
    getCurrentLocation(true);
  };

  const canSubmit = locationConfirmed && 
                    !loading &&
                    productName.trim() &&
                    description.trim();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 5) {
      toast({
        title: 'Too many images',
        description: 'You can upload a maximum of 5 images',
        variant: 'destructive',
      });
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    URL.revokeObjectURL(imagePreviews[index]);
    
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to submit a suggestion',
        variant: 'destructive',
      });
      return;
    }

    if (!productName.trim() || !description.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide product name and description',
        variant: 'destructive',
      });
      return;
    }

    // Block submission if location not confirmed
    if (!locationConfirmed || !location?.latitude || !location?.longitude) {
      console.error('❌ Submission blocked - location not confirmed:', { locationConfirmed, location });
      toast({
        title: 'Location Required',
        description: 'Please enable location access to submit a product suggestion.',
        variant: 'destructive',
      });
      return;
    }

    console.log('📤 Submitting suggestion with location:', {
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city,
      state: location.state,
    });

    const success = await submitSuggestion(
      {
        user_id: user.id,
        product_name: productName,
        description,
        category: category || undefined,
        estimated_price_range: priceRange || undefined,
        additional_notes: additionalNotes || undefined,
        customer_latitude: location.latitude,
        customer_longitude: location.longitude,
        customer_location: {
          address: location.address,
          city: location.city,
          state: location.state,
        },
      },
      images
    );

    if (success) {
      setProductName('');
      setDescription('');
      setCategory('');
      setPriceRange('');
      setAdditionalNotes('');
      setImages([]);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Suggest a Product</h3>
      </div>

      {/* Location Status */}
      {locationLoading ? (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Getting your location... Please wait.
          </AlertDescription>
        </Alert>
      ) : location?.latitude && location?.longitude ? (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <MapPin className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Location detected: {location.city || location.state || 'Ready'}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Location required to submit. Please enable location access.</span>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleRetryLocation}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="productName">Product Name *</Label>
        <Input
          id="productName"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Enter product name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the product you'd like to see"
          required
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category (Optional)</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fruits">Fruits</SelectItem>
            <SelectItem value="vegetables">Vegetables</SelectItem>
            <SelectItem value="dairy">Dairy</SelectItem>
            <SelectItem value="bakery">Bakery</SelectItem>
            <SelectItem value="grocery">Grocery</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceRange">Estimated Price Range (Optional)</Label>
        <Input
          id="priceRange"
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
          placeholder="e.g., ₹50-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
        <Textarea
          id="additionalNotes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any other details..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="images">Product Images (Max 5)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            disabled={images.length >= 5}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('images')?.click()}
            disabled={images.length >= 5}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Images ({images.length}/5)
          </Button>
        </div>

        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {loading ? 'Submitting...' : locationLoading ? 'Getting Location...' : 'Submit Suggestion'}
      </Button>
      
      {!canSubmit && !locationLoading && (
        <p className="text-sm text-muted-foreground text-center">
          {!location ? 'Location is required to submit' : 'Please fill in all required fields'}
        </p>
      )}
    </form>
  );
};
