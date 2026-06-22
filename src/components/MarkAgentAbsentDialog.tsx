import { useEffect, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

export interface ReplacementAgentOption {
  /** delivery_agents.agent_id (the user id stored on daily_orders.assigned_agent_id) */
  userId: string;
  name: string;
}

interface MarkAgentAbsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  ordersToday: number;
  availableAgents: ReplacementAgentOption[];
  onConfirm: (replacementAgentUserId: string | null) => void;
  isPending: boolean;
}

export function MarkAgentAbsentDialog({
  open,
  onOpenChange,
  agentName,
  ordersToday,
  availableAgents,
  onConfirm,
  isPending,
}: MarkAgentAbsentDialogProps) {
  const [transfer, setTransfer] = useState(false);
  const [replacementId, setReplacementId] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setTransfer(false);
      setReplacementId('');
    }
  }, [open]);

  const hasOrders = ordersToday > 0;
  const hasReplacements = availableAgents.length > 0;
  const canConfirm = !transfer || !!replacementId;

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
              {hasOrders && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-destructive">
                  <p className="font-medium">
                    ⚠️ {ordersToday} order{ordersToday > 1 ? 's' : ''} assigned to this partner today
                  </p>
                  {!transfer && (
                    <p className="text-sm mt-1">
                      They'll be moved to the Unassigned Orders page unless you transfer them below.
                    </p>
                  )}
                </div>
              )}

              {hasOrders && (
                <div className="space-y-3 rounded-md border border-border p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="transfer-orders"
                      checked={transfer}
                      onCheckedChange={(v) => {
                        const next = v === true;
                        setTransfer(next);
                        if (!next) setReplacementId('');
                      }}
                      disabled={!hasReplacements || isPending}
                    />
                    <div className="flex-1">
                      <Label htmlFor="transfer-orders" className="font-medium cursor-pointer">
                        Transfer today's orders to another partner
                      </Label>
                      {!hasReplacements && (
                        <p className="text-xs text-muted-foreground mt-1">
                          No other partners are online right now.
                        </p>
                      )}
                    </div>
                  </div>

                  {transfer && hasReplacements && (
                    <Select value={replacementId} onValueChange={setReplacementId} disabled={isPending}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose replacement partner" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAgents.map((a) => (
                          <SelectItem key={a.userId} value={a.userId}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
            onClick={() => onConfirm(transfer && replacementId ? replacementId : null)}
            disabled={isPending || !canConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending
              ? 'Processing...'
              : transfer && replacementId
              ? 'Mark Absent & Transfer'
              : 'Mark Absent'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
