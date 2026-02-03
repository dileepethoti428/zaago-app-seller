import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Package, Loader2 } from 'lucide-react';
import type { HandoverAgent } from '@/hooks/useSubscriptionHandover';

interface HandoverConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: HandoverAgent | null;
  selectedDate: 'today' | 'tomorrow';
  onConfirm: () => void;
  isConfirming: boolean;
}

export function HandoverConfirmDialog({
  open,
  onOpenChange,
  agent,
  selectedDate,
  onConfirm,
  isConfirming,
}: HandoverConfirmDialogProps) {
  if (!agent) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Product Handover?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are confirming that the following products have been handed
                over to <strong>{agent.agentName}</strong> for{' '}
                {selectedDate === 'today' ? "today's" : "tomorrow's"} deliveries:
              </p>
              <ul className="space-y-1">
                {agent.products.map((product) => (
                  <li
                    key={product.productId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {product.productName}:{' '}
                      <strong>
                        {product.totalQuantity} {product.productUnit}
                      </strong>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Total: {agent.totalOrders}{' '}
                {agent.totalOrders === 1 ? 'order' : 'orders'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Confirm Handover'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
