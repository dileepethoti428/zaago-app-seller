import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAgentCodOrders } from '@/hooks/useAgentCodOrders';
import type { TimePeriod, StatusFilter } from '@/hooks/useCodSettlements';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string | null;
  agentName: string;
  profileImage: string | null;
  period: TimePeriod;
  statusFilter: StatusFilter;
}

export default function AgentCodDetailDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
  profileImage,
  period,
  statusFilter,
}: Props) {
  const { data: orders, isLoading, settleOne, isSettlingOne } = useAgentCodOrders(
    agentId,
    period,
    statusFilter
  );

  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    setVisibleCount(5);
  }, [agentId, period, statusFilter, open]);

  const pendingAmount = (orders || [])
    .filter(o => o.status === 'pending')
    .reduce((sum, o) => sum + Number(o.amount), 0);

  const settledAmount = (orders || [])
    .filter(o => o.status === 'settled')
    .reduce((sum, o) => sum + Number(o.amount), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImage || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {agentName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-left">{agentName}</SheetTitle>
              <p className="text-sm text-muted-foreground">COD Order History</p>
            </div>
          </div>

          {/* Summary */}
          <div className="flex gap-3 mt-3">
            <div className="flex-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold text-orange-600">₹{pendingAmount.toFixed(0)}</p>
            </div>
            <div className="flex-1 rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Settled</p>
              <p className="text-lg font-bold text-green-600">₹{settledAmount.toFixed(0)}</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No COD orders found</p>
              </div>
            ) : (
              orders.slice(0, visibleCount).map(order => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground font-mono">
                        #{order.order_id.slice(0, 8)}
                      </p>
                      <Badge
                        className={
                          order.status === 'settled'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-0'
                        }
                      >
                        {order.status === 'settled' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5">
                    <p className="font-semibold text-foreground">₹{Number(order.amount).toFixed(0)}</p>
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-full"
                        disabled={isSettlingOne}
                        onClick={() => settleOne(order.id)}
                      >
                        Settle
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}

            {orders && orders.length > visibleCount && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount(prev => prev + 5)}
                >
                  View More ({orders.length - visibleCount} remaining)
                </Button>
              </div>
            )}
            {orders && visibleCount > 5 && orders.length <= visibleCount && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setVisibleCount(5)}>
                  View Less
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
