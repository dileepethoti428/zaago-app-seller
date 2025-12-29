import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

interface UpdateStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    currentStock: number;
    unit: string;
    suggestedRefill?: number;
  } | null;
  onSuccess?: () => void;
}

export const UpdateStockModal = ({ isOpen, onClose, product, onSuccess }: UpdateStockModalProps) => {
  const [newStock, setNewStock] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpen = () => {
    if (product) {
      // Pre-fill with current stock + suggested refill
      const suggested = product.currentStock + (product.suggestedRefill || 0);
      setNewStock(suggested.toString());
    }
  };

  const handleUpdate = async () => {
    if (!product || !newStock) return;

    const stockValue = parseFloat(newStock);
    if (isNaN(stockValue) || stockValue < 0) {
      toast.error('Please enter a valid stock quantity');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: stockValue })
        .eq('id', product.id);

      if (error) throw error;

      toast.success(`Stock updated to ${stockValue} ${product.unit}`);
      onSuccess?.();
      onClose();
      setNewStock('');
    } catch (error: any) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { 
      if (!open) onClose(); 
      else handleOpen();
    }}>
      <DialogContent className="bg-zaago-card border-zaago-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Package className="w-5 h-5 text-zaago-green" />
            Update Stock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="font-medium text-foreground">{product.name}</p>
            <p className="text-sm text-zaago-muted-foreground">
              Current stock: {product.currentStock} {product.unit}
            </p>
            {product.suggestedRefill && product.suggestedRefill > 0 && (
              <p className="text-sm text-orange-500">
                Suggested refill: +{product.suggestedRefill} {product.unit}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newStock" className="text-foreground">
              New Stock Quantity ({product.unit})
            </Label>
            <Input
              id="newStock"
              type="number"
              min="0"
              step="0.5"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              placeholder={`Enter new stock in ${product.unit}`}
              className="bg-zaago-accent/30 border-zaago-border text-foreground"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zaago-border text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating || !newStock}
            className="bg-zaago-green hover:bg-zaago-green/90 text-white"
          >
            {isUpdating ? 'Updating...' : 'Update Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
