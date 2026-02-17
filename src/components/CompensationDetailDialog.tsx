import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package, User, Calendar, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface CompensationDetail {
  productName: string;
  quantity: number;
  agentName: string;
  status: string;
  originalMissedDate: string;
  compensationDate: string;
}

interface CompensationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: CompensationDetail | null;
}

export const CompensationDetailDialog = ({
  open,
  onOpenChange,
  details,
}: CompensationDetailDialogProps) => {
  if (!details) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            Compensation Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <Package className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Product</p>
              <p className="text-sm text-muted-foreground">
                {details.productName} x{details.quantity}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Assigned Agent</p>
              <p className="text-sm text-muted-foreground">{details.agentName}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Original Missed Date</p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(details.originalMissedDate), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Compensation Date</p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(details.compensationDate), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <div>
            <Badge variant={details.status === 'delivered' ? 'default' : 'secondary'}>
              {details.status}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
