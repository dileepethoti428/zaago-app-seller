import { useState } from 'react';
import { format, parseISO, addDays, isBefore, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCreateVacationCompensation, useAssignCompensationAgent } from '@/hooks/useVacationCompensations';
import { useDeliveryAgentsByLocation } from '@/hooks/useAssignPrimaryAgent';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, UserPlus, Check, AlertCircle, User, Phone, MapPin, Package, Star, Circle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VacationCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  vacationPeriodId: string;
  originalVacationDate: string;
  locationId: number | null;
  existingCompensationDates: string[];
  vacationDates: string[];
  // Customer details
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  // Product details
  productName?: string;
  quantity?: number;
}

export const VacationCompensationModal = ({
  isOpen,
  onClose,
  subscriptionId,
  vacationPeriodId,
  originalVacationDate,
  locationId,
  existingCompensationDates,
  vacationDates,
  customerName,
  customerPhone,
  customerAddress,
  productName,
  quantity
}: VacationCompensationModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [step, setStep] = useState<'date' | 'agent'>('date');

  const { mutate: createCompensation, isPending: isCreating } = useCreateVacationCompensation();
  const { mutate: assignAgent, isPending: isAssigning } = useAssignCompensationAgent();

  // Fetch agents for this location with enhanced details
  const { data: agents } = useQuery({
    queryKey: ['delivery-agents-by-location', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('delivery_agents')
        .select('id, name, phone, vehicle_type, vehicle_number, average_rating, total_deliveries, is_online, performance_score')
        .eq('location_id', locationId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId && isOpen
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleCreateCompensation = () => {
    if (!selectedDate) return;

    createCompensation({
      subscriptionId,
      vacationPeriodId,
      originalVacationDate,
      compensationDeliveryDate: format(selectedDate, 'yyyy-MM-dd')
    }, {
      onSuccess: () => {
        if (agents && agents.length > 0) {
          setStep('agent');
        } else {
          handleClose();
        }
      }
    });
  };

  const handleAssignAgent = (compensationId: string) => {
    if (!selectedAgentId) {
      handleClose();
      return;
    }

    assignAgent({
      compensationId,
      agentId: selectedAgentId,
      subscriptionId
    }, {
      onSuccess: () => {
        handleClose();
      }
    });
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    setSelectedAgentId('');
    setStep('date');
    onClose();
  };

  // Disable dates that are: in the past, vacation dates, or already compensated
  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Past dates
    if (isBefore(date, today)) return true;
    
    // Vacation dates (can't deliver on vacation)
    if (vacationDates.includes(dateStr)) return true;
    
    // Already used for compensation
    if (existingCompensationDates.includes(dateStr)) return true;
    
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-green-500" />
            Assign Extra Delivery
          </DialogTitle>
          <DialogDescription>
            Compensate for vacation day: <strong>{originalVacationDate && format(parseISO(originalVacationDate), 'EEEE, MMMM d, yyyy')}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Customer Details Card */}
        {(customerName || productName) && (
          <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
            {customerName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-semibold">{customerName}</span>
              </div>
            )}
            {customerPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{customerPhone}</span>
              </div>
            )}
            {customerAddress && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{customerAddress}</span>
              </div>
            )}
            {productName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-2 mt-2">
                <Package className="h-4 w-4" />
                <span>{productName}</span>
                {quantity && <Badge variant="secondary">{quantity} units</Badge>}
              </div>
            )}
          </div>
        )}

        {step === 'date' ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Select Compensation Delivery Date
              </Label>
              <div className="flex justify-center border rounded-lg p-3 bg-muted/30">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={isDateDisabled}
                  fromDate={addDays(new Date(), 1)}
                  className="rounded-md"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                  🏖️ Vacation days excluded
                </Badge>
                <Badge variant="outline" className="border-green-500/30 text-green-400">
                  ✓ Already compensated excluded
                </Badge>
              </div>
            </div>

            {selectedDate && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm font-medium text-green-400">
                  Extra delivery will be scheduled for:
                </p>
                <p className="text-lg font-bold text-green-300">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Compensation delivery created for {selectedDate && format(selectedDate, 'MMM d, yyyy')}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Assign Delivery Agent (Optional)
              </Label>
              {agents && agents.length > 0 ? (
                <div className="space-y-2">
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <span>{agent.name}</span>
                            {agent.average_rating && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                {agent.average_rating.toFixed(1)}
                              </span>
                            )}
                            {agent.vehicle_type && (
                              <span className="text-xs text-muted-foreground capitalize">
                                • {agent.vehicle_type}
                              </span>
                            )}
                            {agent.is_online && (
                              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selected Agent Details */}
                  {selectedAgentId && agents.find(a => a.id === selectedAgentId) && (
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm">
                      {(() => {
                        const agent = agents.find(a => a.id === selectedAgentId);
                        if (!agent) return null;
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{agent.name}</span>
                              {agent.is_online ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                  Online
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-xs">
                                  Offline
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                              {agent.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{agent.phone}</span>
                                </div>
                              )}
                              {agent.vehicle_type && (
                                <div className="capitalize">
                                  {agent.vehicle_type} {agent.vehicle_number && `(${agent.vehicle_number})`}
                                </div>
                              )}
                              {agent.average_rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span>{agent.average_rating.toFixed(1)} rating</span>
                                </div>
                              )}
                              {agent.total_deliveries !== null && (
                                <div>{agent.total_deliveries} deliveries</div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                  <p className="text-sm text-yellow-400">
                    No delivery agents available for this location. You can assign an agent later.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === 'date' ? (
            <Button 
              onClick={handleCreateCompensation}
              disabled={!selectedDate || isCreating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreating ? 'Creating...' : 'Confirm Date'}
            </Button>
          ) : (
            <Button 
              onClick={() => handleAssignAgent('')}
              disabled={isAssigning}
              className="bg-green-600 hover:bg-green-700"
            >
              {selectedAgentId ? (isAssigning ? 'Assigning...' : 'Assign & Close') : 'Skip & Close'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
