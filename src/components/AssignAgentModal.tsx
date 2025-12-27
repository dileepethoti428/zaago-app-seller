import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAssignPrimaryAgent } from '@/hooks/useAssignPrimaryAgent';
import { useDeliveryAgentsNearSeller, useDeliveryAgentsWithCapacity } from '@/hooks/useDeliveryAgentsCapacity';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, User, Navigation, ArrowLeft } from 'lucide-react';

interface AssignAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string | undefined;
  locationId: number | null;
  onAssigned: () => void;
}

export const AssignAgentModal = ({
  isOpen,
  onClose,
  subscriptionId,
  locationId,
  onAssigned,
}: AssignAgentModalProps) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showGPSView, setShowGPSView] = useState(false);
  const { mutate: assignAgent, isPending: isAssigning } = useAssignPrimaryAgent();

  // GPS-based agents (10km radius)
  const { data: gpsAgents, isLoading: gpsLoading } = useDeliveryAgentsNearSeller();
  
  // Location-based agents with capacity
  const { data: locationAgents, isLoading: locationLoading } = useDeliveryAgentsWithCapacity(locationId);

  // Reset selection when modal opens or view changes
  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId(null);
      setShowGPSView(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedAgentId(null);
  }, [showGPSView]);

  const handleConfirm = () => {
    if (!subscriptionId || !selectedAgentId) return;

    assignAgent(
      { subscriptionId, agentId: selectedAgentId },
      {
        onSuccess: () => {
          onAssigned();
        },
      }
    );
  };

  const isLoading = showGPSView ? gpsLoading : locationLoading;
  const agents = showGPSView ? gpsAgents : locationAgents;

  const renderAgentCard = (agent: any) => {
    const orderCount = agent.orders_tomorrow ?? agent.orders_today ?? 0;
    const maxCapacity = agent.max_capacity ?? 30;
    const isFull = orderCount >= maxCapacity;
    const capacityPercentage = (orderCount / maxCapacity) * 100;

    return (
      <div
        key={agent.id}
        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
          selectedAgentId === agent.id
            ? 'border-primary bg-primary/5'
            : isFull
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-border hover:bg-muted/50'
        }`}
        onClick={() => !isFull && setSelectedAgentId(agent.id)}
      >
        <RadioGroupItem value={agent.id} id={agent.id} disabled={isFull} />
        <Label
          htmlFor={agent.id}
          className={`flex-1 cursor-pointer ${isFull ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{agent.name}</span>
              {showGPSView && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                  <Navigation className="h-3 w-3 mr-1" />
                  GPS
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Capacity indicator */}
              <Badge
                variant={isFull ? 'destructive' : capacityPercentage > 80 ? 'secondary' : 'outline'}
                className={`text-xs ${
                  isFull 
                    ? 'bg-destructive text-destructive-foreground' 
                    : capacityPercentage > 80 
                    ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
                    : ''
                }`}
              >
                {orderCount}/{maxCapacity} orders
              </Badge>
              {isFull && (
                <Badge variant="destructive" className="text-xs">
                  At Capacity
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {showGPSView && agent.distance_km !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {agent.distance_km.toFixed(1)} km away
              </span>
            )}
            {!showGPSView && agent.location_id && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location: {agent.location_id}
              </span>
            )}
            {!agent.is_online && (
              <Badge variant="outline" className="text-xs">Offline</Badge>
            )}
          </div>
        </Label>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Delivery Agent</DialogTitle>
          <DialogDescription>
            {showGPSView 
              ? 'Showing delivery agents within 10km of your location'
              : 'Select a delivery agent for this subscription'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Toggle between views */}
        <div className="flex gap-2">
          {showGPSView ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGPSView(false)}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assigned Agents
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGPSView(true)}
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Find New Agents in 10km Range
            </Button>
          )}
        </div>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !agents || agents.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {showGPSView 
                  ? 'No delivery agents found within 10km of your location'
                  : `No active delivery agents found for location ID: ${locationId}`
                }
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto pr-2">
              <RadioGroup
                value={selectedAgentId || ''}
                onValueChange={setSelectedAgentId}
                className="space-y-3"
              >
                {agents.map(renderAgentCard)}
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedAgentId || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              'Confirm Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
