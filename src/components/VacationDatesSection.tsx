import { useState } from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { VacationCompensationModal } from './VacationCompensationModal';
import { useVacationDatesWithStatus, VacationPeriod } from '@/hooks/useVacationCompensations';
import { ChevronDown, ChevronUp, Calendar, CalendarPlus, CheckCircle, Clock, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VacationDatesSectionProps {
  subscriptionId: string;
  vacationPeriods: VacationPeriod[];
  locationId: number | null;
}

export const VacationDatesSection = ({ 
  subscriptionId, 
  vacationPeriods,
  locationId 
}: VacationDatesSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [compensationModal, setCompensationModal] = useState<{
    open: boolean;
    vacationDate: string;
    vacationPeriodId: string;
  }>({ open: false, vacationDate: '', vacationPeriodId: '' });

  const { data: vacationDates, isLoading } = useVacationDatesWithStatus(subscriptionId, vacationPeriods);

  if (!vacationPeriods || vacationPeriods.length === 0) return null;

  const activeVacations = vacationPeriods.filter(v => v.status === 'active');
  if (activeVacations.length === 0) return null;

  const totalDays = vacationDates?.length || 0;
  const compensatedDays = vacationDates?.filter(d => d.compensation)?.length || 0;
  const pendingCompensation = totalDays - compensatedDays;

  return (
    <div className="mt-4 border border-orange-500/20 rounded-lg bg-orange-500/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto hover:bg-orange-500/10"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏖️</span>
              <div className="text-left">
                <p className="font-medium text-orange-400">Vacation Days</p>
                <p className="text-xs text-muted-foreground">
                  {totalDays} days total • {compensatedDays} compensated • {pendingCompensation} pending
                </p>
              </div>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4">
          {/* Vacation Period Summary */}
          {activeVacations.map(period => (
            <div 
              key={period.id} 
              className="mb-3 p-2 bg-orange-500/10 rounded-md text-sm"
            >
              <span className="font-medium text-orange-400">
                {format(parseISO(period.start_date), 'MMM d')} - {format(parseISO(period.end_date), 'MMM d, yyyy')}
              </span>
            </div>
          ))}

          {/* Individual Vacation Dates */}
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading vacation dates...</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {vacationDates?.map(({ date, vacationPeriodId, compensation, isPast: dateIsPast }) => {
                const dateObj = parseISO(date);
                const isDateToday = isToday(dateObj);
                
                return (
                  <div 
                    key={date}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md border",
                      dateIsPast 
                        ? "bg-muted/30 border-muted opacity-60" 
                        : isDateToday
                          ? "bg-orange-500/20 border-orange-500/40"
                          : "bg-background border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className={cn(
                        "h-4 w-4",
                        dateIsPast ? "text-muted-foreground" : "text-orange-400"
                      )} />
                      <div>
                        <p className={cn(
                          "font-medium text-sm",
                          dateIsPast && "text-muted-foreground"
                        )}>
                          {format(dateObj, 'EEE, MMM d, yyyy')}
                          {isDateToday && <span className="ml-2 text-xs text-orange-400">(Today)</span>}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs mt-1",
                            dateIsPast 
                              ? "border-muted text-muted-foreground" 
                              : "border-orange-500/30 text-orange-400"
                          )}
                        >
                          Vacation / Skipped
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {compensation ? (
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-green-500">
                            <CheckCircle className="h-3 w-3" />
                            <span className="text-xs font-medium">Compensated</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            → {format(parseISO(compensation.compensation_delivery_date), 'MMM d')}
                          </p>
                          {compensation.status === 'assigned' && compensation.delivery_agent && (
                            <p className="text-xs text-blue-400">
                              Agent: {compensation.delivery_agent.name}
                            </p>
                          )}
                          {compensation.status === 'pending' && (
                            <Badge variant="outline" className="text-xs mt-1 border-yellow-500/30 text-yellow-400">
                              <Clock className="h-3 w-3 mr-1" />
                              Awaiting Agent
                            </Badge>
                          )}
                        </div>
                      ) : !dateIsPast ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompensationModal({
                            open: true,
                            vacationDate: date,
                            vacationPeriodId
                          })}
                          className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <CalendarPlus className="h-3 w-3 mr-1" />
                          Assign Extra Delivery
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
                          Not Compensated
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Compensation Modal */}
      <VacationCompensationModal
        isOpen={compensationModal.open}
        onClose={() => setCompensationModal({ open: false, vacationDate: '', vacationPeriodId: '' })}
        subscriptionId={subscriptionId}
        vacationPeriodId={compensationModal.vacationPeriodId}
        originalVacationDate={compensationModal.vacationDate}
        locationId={locationId}
        existingCompensationDates={vacationDates?.filter(d => d.compensation).map(d => d.compensation!.compensation_delivery_date) || []}
        vacationDates={vacationDates?.map(d => d.date) || []}
      />
    </div>
  );
};
