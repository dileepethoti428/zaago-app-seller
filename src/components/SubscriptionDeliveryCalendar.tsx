import { useMemo, useState } from 'react';
import { format, subDays, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, parseISO, isBefore } from 'date-fns';
import { CheckCircle, XCircle, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeliveryDayStatus } from '@/hooks/useSubscriptionDeliveryHistory';
import { getCurrentISTTime } from '@/utils/timeZone';
import { CompensationDetailDialog } from '@/components/CompensationDetailDialog';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionDeliveryCalendarProps {
  history: Record<string, DeliveryDayStatus>;
  isLoading: boolean;
  onMissedDateClick: (date: string, dailyOrderId: string | null) => void;
}

export const SubscriptionDeliveryCalendar = ({
  history,
  isLoading,
  onMissedDateClick,
}: SubscriptionDeliveryCalendarProps) => {
  const today = getCurrentISTTime();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [compensationDetail, setCompensationDetail] = useState<{
    open: boolean;
    details: any;
  }>({ open: false, details: null });

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getDateStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const entry = history[dateStr];

    if (!entry) return 'none';

    if (entry.status === 'delivered') return 'delivered';

    if (dateStr < todayStr && ['pending', 'failed', 'undelivered', 'cancelled_agent', 'delivery_failed'].includes(entry.status)) {
      if (entry.hasCompensation) return 'compensated';
      return 'missed';
    }

    if (dateStr >= todayStr && entry.status === 'pending') return 'scheduled';

    if (['accepted', 'assigned', 'packed', 'accepted_by_seller'].includes(entry.status)) return 'in_progress';
    if (['skipped_by_seller', 'cancelled'].includes(entry.status)) return 'skipped';

    return 'none';
  };

  const handleCompensatedClick = async (dateStr: string) => {
    try {
      const { data, error } = await supabase
        .from('vacation_compensations')
        .select(`
          id, quantity, compensation_delivery_date, original_vacation_date, status,
          product_id,
          products ( name ),
          delivery_agents ( name )
        `)
        .eq('original_vacation_date', dateStr)
        .limit(1)
        .maybeSingle();

      if (data) {
        setCompensationDetail({
          open: true,
          details: {
            productName: (data as any).products?.name || 'Unknown',
            quantity: data.quantity || 0,
            agentName: (data as any).delivery_agents?.name || 'Unassigned',
            status: data.status || 'pending',
            originalMissedDate: data.original_vacation_date,
            compensationDate: data.compensation_delivery_date || data.original_vacation_date,
          },
        });
      }
    } catch (err) {
      console.error('Error fetching compensation details:', err);
    }
  };

  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(prev => subDays(startOfMonth(prev), 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(prev => addDays(endOfMonth(prev), 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, i) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isToday = isSameDay(date, today);
          const status = getDateStatus(date);

          return (
            <button
              key={i}
              disabled={status !== 'missed' && status !== 'compensated'}
              onClick={() => {
                if (status === 'missed') {
                  const entry = history[dateStr];
                  onMissedDateClick(dateStr, entry?.dailyOrderId || null);
                } else if (status === 'compensated') {
                  handleCompensatedClick(dateStr);
                }
              }}
              className={`
                relative flex flex-col items-center justify-center p-1 h-10 rounded-md text-xs transition-colors
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${isToday ? 'ring-1 ring-primary' : ''}
                ${status === 'missed' ? 'cursor-pointer hover:bg-destructive/10 bg-destructive/5' : ''}
                ${status === 'delivered' ? 'bg-green-500/10' : ''}
                ${status === 'compensated' ? 'bg-blue-500/10 cursor-pointer hover:bg-blue-500/20' : ''}
                ${status === 'scheduled' ? 'bg-muted/50' : ''}
                ${status === 'none' ? '' : ''}
              `}
            >
              <span className={`text-xs ${isToday ? 'font-bold' : ''}`}>
                {format(date, 'd')}
              </span>
              {status === 'delivered' && <CheckCircle className="h-3 w-3 text-green-500" />}
              {status === 'missed' && <XCircle className="h-3 w-3 text-destructive" />}
              {status === 'compensated' && <CheckCircle className="h-3 w-3 text-blue-500" />}
              {status === 'scheduled' && <Circle className="h-3 w-3 text-muted-foreground" />}
              {status === 'in_progress' && <Circle className="h-3 w-3 text-primary fill-primary/30" />}
              {status === 'skipped' && <span className="text-[8px] text-muted-foreground">skip</span>}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
        <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Delivered</div>
        <div className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> Missed (click to compensate)</div>
        <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-blue-500" /> Compensated (click for details)</div>
        <div className="flex items-center gap-1"><Circle className="h-3 w-3 text-muted-foreground" /> Scheduled</div>
      </div>

      <CompensationDetailDialog
        open={compensationDetail.open}
        onOpenChange={(open) => setCompensationDetail(prev => ({ ...prev, open }))}
        details={compensationDetail.details}
      />
    </div>
  );
};
