import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOffer, CreateOfferInput } from '@/hooks/useSpecialOffers';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
}

export const CreateOfferDialog = () => {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(15);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [priorityRank, setPriorityRank] = useState(1);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [maxQuantityPerUser, setMaxQuantityPerUser] = useState<number | ''>('');
  const [totalQuantityAvailable, setTotalQuantityAvailable] = useState<number | ''>('');

  const createOffer = useCreateOffer();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSellerProducts();
      // Set default dates
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setValidFrom(now.toISOString().slice(0, 16));
      setValidUntil(sevenDaysLater.toISOString().slice(0, 16));
    }
  }, [open]);

  const fetchSellerProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    setProducts(data || []);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const offerPrice = selectedProduct 
    ? selectedProduct.price * (1 - discountPercentage / 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    if (discountPercentage <= 0 || discountPercentage >= 100) {
      toast({
        title: "Error",
        description: "Discount must be between 1% and 99%",
        variant: "destructive",
      });
      return;
    }

    if (new Date(validUntil) <= new Date(validFrom)) {
      toast({
        title: "Error",
        description: "Valid Until must be after Valid From",
        variant: "destructive",
      });
      return;
    }

    const input: CreateOfferInput = {
      product_id: selectedProductId,
      discount_percentage: discountPercentage,
      valid_from: validFrom,
      valid_until: validUntil,
      priority_rank: priorityRank,
      offer_title: offerTitle || `${discountPercentage}% Off`,
      offer_description: offerDescription || undefined,
      max_quantity_per_user: maxQuantityPerUser ? Number(maxQuantityPerUser) : undefined,
      total_quantity_available: totalQuantityAvailable ? Number(totalQuantityAvailable) : undefined,
    };

    createOffer.mutate(input, {
      onSuccess: () => {
        setOpen(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setSelectedProductId('');
    setDiscountPercentage(15);
    setOfferTitle('');
    setOfferDescription('');
    setMaxQuantityPerUser('');
    setTotalQuantityAvailable('');
    setPriorityRank(1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-zaago-green hover:bg-zaago-green-light text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Special Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zaago-card border-zaago-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Special Offer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product" className="text-foreground">Select Product *</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="bg-transparent border-zaago-border text-foreground">
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent className="bg-zaago-card border-zaago-border">
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id} className="text-foreground">
                    {product.name} - ₹{product.price} ({product.stock_quantity} in stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount" className="text-foreground">Discount Percentage *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="discount"
                type="number"
                min="1"
                max="99"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="bg-transparent border-zaago-border text-foreground"
                required
              />
              <span className="text-zaago-muted-foreground">%</span>
            </div>
            {selectedProduct && (
              <p className="text-sm text-zaago-muted-foreground">
                Original: ₹{selectedProduct.price.toFixed(2)} → Offer Price: ₹{offerPrice.toFixed(2)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom" className="text-foreground">Valid From *</Label>
              <Input
                id="validFrom"
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="bg-transparent border-zaago-border text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil" className="text-foreground">Valid Until *</Label>
              <Input
                id="validUntil"
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="bg-transparent border-zaago-border text-foreground"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-foreground">
              Priority Rank * 
              <span className="text-sm text-zaago-muted-foreground ml-2">(1 = highest priority)</span>
            </Label>
            <Input
              id="priority"
              type="number"
              min="1"
              value={priorityRank}
              onChange={(e) => setPriorityRank(Number(e.target.value))}
              className="bg-transparent border-zaago-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Offer Title (Optional)</Label>
            <Input
              id="title"
              type="text"
              placeholder={`${discountPercentage}% Off`}
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
              className="bg-transparent border-zaago-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add offer details..."
              value={offerDescription}
              onChange={(e) => setOfferDescription(e.target.value)}
              className="bg-transparent border-zaago-border text-foreground"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPerUser" className="text-foreground">Max Qty Per User</Label>
              <Input
                id="maxPerUser"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxQuantityPerUser}
                onChange={(e) => setMaxQuantityPerUser(e.target.value ? Number(e.target.value) : '')}
                className="bg-transparent border-zaago-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalQty" className="text-foreground">Total Qty Available</Label>
              <Input
                id="totalQty"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={totalQuantityAvailable}
                onChange={(e) => setTotalQuantityAvailable(e.target.value ? Number(e.target.value) : '')}
                className="bg-transparent border-zaago-border text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-zaago-border text-foreground hover:bg-zaago-accent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-zaago-green hover:bg-zaago-green-light text-white"
              disabled={createOffer.isPending}
            >
              {createOffer.isPending ? 'Creating...' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
