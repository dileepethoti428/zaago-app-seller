import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDeliveryAgentsNearSeller } from '@/hooks/useDeliveryAgentsCapacity';
import { useCreateCompensationOrder } from '@/hooks/useCreateCompensationOrder';
import { CalendarIcon, User, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface CompensationAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missedDate: string;
  subscriptionId: string;
  customerId: string;
  productId: string;
  productName: string;
  customerName: string;
  quantity: number;
}

export const CompensationAssignmentDialog = ({
  open,
  onOpenChange,
  missedDate,
  subscriptionId,
  customerId,
  productId,
  productName,
  customerName,
  quantity,
}: CompensationAssignmentDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { data: agents, isLoading: agentsLoading } = useDeliveryAgentsNearSeller();
  const createCompensation = useCreateCompensationOrder();

  const handleAssign = async () => {
    if (!selectedDate || !selectedAgentId) return;

    await createCompensation.mutateAsync({
      subscriptionId,
      customerId,
      productId,
      originalMissedDate: missedDate,
      compensationDate: format(selectedDate, 'yyyy-MM-dd'),
      agentId: selectedAgentId,
      quantity,
      reason: 'delivery_failed',
    });

    onOpenChange(false);
    setSelectedDate(undefined);
    setSelectedAgentId(null);
  };

  const tomorrow = addDays(new Date(), 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Compensation</DialogTitle>
          <DialogDescription>
            {missedDate ? `Missed delivery on ${format(new Date(missedDate + 'T00:00:00'), 'MMM d, yyyy')}` : 'Assign compensation delivery'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer & Product Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Customer:</span> {customerName}</p>
            <p><span className="text-muted-foreground">Product:</span> {productName} × {quantity}</p>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Compensation Delivery Date</label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setDatePickerOpen(false);
                  }}
                  disabled={(date) => date < tomorrow}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Agent Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Delivery Agent</label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {agentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : agents && agents.length > 0 ? (
                agents.map((agent) => {
                  const isAtCapacity = agent.available_slots <= 0;
                  const isSelected = selectedAgentId === agent.agent_id;

                  return (
                    <button
                      key={agent.agent_id}
                      onClick={() => setSelectedAgentId(agent.agent_id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{agent.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {agent.distance_km && (
                              <>
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {agent.distance_km.toFixed(1)} km
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>{agent.orders_tomorrow}/{agent.max_capacity} orders</span>
                            {isAtCapacity && (
                              <Badge variant="destructive" className="text-[10px] h-4">
                                <AlertTriangle className="h-2 w-2 mr-0.5" />
                                Full
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Badge className="bg-primary text-primary-foreground">Selected</Badge>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No delivery agents found nearby.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!selectedDate || !selectedAgentId || createCompensation.isPending}
            onClick={handleAssign}
          >
            {createCompensation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Assign Compensation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
