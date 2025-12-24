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
import { AlertTriangle } from 'lucide-react';

interface MarkAgentAbsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  ordersToday: number;
  onConfirm: () => void;
  isPending: boolean;
}

export function MarkAgentAbsentDialog({
  open,
  onOpenChange,
  agentName,
  ordersToday,
  onConfirm,
  isPending,
}: MarkAgentAbsentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Mark Agent Absent Today?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will mark <strong>{agentName}</strong> as offline for today.
              </p>
              {ordersToday > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-destructive">
                  <p className="font-medium">
                    ⚠️ {ordersToday} order{ordersToday > 1 ? 's' : ''} will be unassigned
                  </p>
                  <p className="text-sm mt-1">
                    You can manually reassign these orders from the Unassigned Orders page.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                The agent can be marked online again when available.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Processing...' : 'Mark Absent'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
