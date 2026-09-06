import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Clock, Calendar, Phone, Bike, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useDeliveredDayDetails } from '@/hooks/useDeliveredDayDetails';
import { formatSlotLabel, formatSlotRange, getSlotWindow } from '@/config/deliverySlots';

interface DeliveredDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  dailyOrderId: string | null;
  subscriptionId: string | null;
}

export const DeliveredDetailDialog = ({
  open,
  onOpenChange,
  date,
  dailyOrderId,
  subscriptionId,
}: DeliveredDetailDialogProps) => {
  const { data, isLoading } = useDeliveredDayDetails(
    open ? dailyOrderId : null,
    open ? subscriptionId : null
  );

  const completedIST = data?.completedAt
    ? toZonedTime(parseISO(data.completedAt), 'Asia/Kolkata')
    : null;

  const slotWindow = getSlotWindow(data?.slot);
  let onTime: boolean | null = null;
  if (completedIST && slotWindow) {
    const hour = completedIST.getHours() + completedIST.getMinutes() / 60;
    onTime = hour >= slotWindow.startHour && hour <= slotWindow.endHour;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Delivery Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Delivery Date</p>
                <p className="text-sm text-muted-foreground">
                  {date ? format(parseISO(date), 'dd MMM yyyy') : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Delivered At</p>
                <p className="text-sm text-muted-foreground">
                  {completedIST
                    ? `${format(completedIST, 'dd MMM yyyy, h:mm a')} IST`
                    : 'Time not recorded'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline">
                    Slot: {formatSlotLabel(data?.slot)}
                    {formatSlotRange(data?.slot) ? ` (${formatSlotRange(data?.slot)})` : ''}
                  </Badge>
                  {onTime === true && (
                    <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15 border-0">
                      On time
                    </Badge>
                  )}
                  {onTime === false && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Outside slot
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Delivery Partner</p>
                <p className="text-sm text-muted-foreground">
                  {data?.agentName || 'Not recorded'}
                </p>
                {data?.agentVehicle && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Bike className="w-3 h-3" /> {data.agentVehicle}
                  </p>
                )}
                {data?.agentPhone && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">{data.agentPhone}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      onClick={() => window.open(`tel:${data.agentPhone}`, '_self')}
                    >
                      <Phone className="w-3 h-3 mr-1" /> Call
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {!data?.completedAt && !data?.agentName && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                This day was marked delivered, but no partner or completion time was recorded.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
