import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const PRESET_REASONS = [
  'Customer requested cancellation',
  'Out of stock',
  'Unable to fulfill',
  'Other',
];

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderStatus: string;
  isProcessing?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}

export const CancelOrderDialog = ({
  open,
  onOpenChange,
  orderStatus,
  isProcessing = false,
  onConfirm,
}: CancelOrderDialogProps) => {
  const [selected, setSelected] = useState<string>(PRESET_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');

  const isLateStage = orderStatus === 'assigned' || orderStatus === 'out_for_delivery';
  const finalReason = selected === 'Other' ? otherReason.trim() : selected;
  const canSubmit = finalReason.length > 0 && !isProcessing;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    await onConfirm(finalReason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zaago-card border-zaago-border">
        <DialogHeader>
          <DialogTitle>Cancel Order</DialogTitle>
          <DialogDescription>
            Please select a reason. The customer will be notified with this reason.
          </DialogDescription>
        </DialogHeader>

        {isLateStage && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-amber-200">
              This order has already been handed to the delivery partner. Cancelling
              will notify them to return the parcel.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Label>Reason</Label>
          <RadioGroup value={selected} onValueChange={setSelected}>
            {PRESET_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={`reason-${reason}`} />
                <Label htmlFor={`reason-${reason}`} className="cursor-pointer font-normal">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selected === 'Other' && (
            <Textarea
              placeholder="Please specify the reason..."
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              className="bg-zaago-accent border-zaago-border"
              rows={3}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {isProcessing ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
