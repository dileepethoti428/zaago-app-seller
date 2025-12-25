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
import { useDeliveryAgentsWithCapacity, useDeliveryAgentsNearSeller } from '@/hooks/useDeliveryAgentsCapacity';
import { useAssignOrderToAgent } from '@/hooks/useManualAgentAssignment';
import { AlertTriangle, User, Loader2, MapPin, Search, ArrowLeft } from 'lucide-react';

interface ManualAgentAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  locationId?: number;
  onCreateNewAgent: () => void;
}

export function ManualAgentAssignmentModal({
  open,
  onOpenChange,
  orderId,
  locationId,
  onCreateNewAgent,
}: ManualAgentAssignmentModalProps) {
  // State to toggle between location-based and GPS-based views
  const [showGPSView, setShowGPSView] = useState(false);
  
  // Location-based agents (default)
  const { data: locationAgents, isLoading: locationLoading } = useDeliveryAgentsWithCapacity(locationId || null);
  
  // GPS-based agents (10km radius)
  const { data: gpsAgents, isLoading: gpsLoading } = useDeliveryAgentsNearSeller();
  
  const assignOrder = useAssignOrderToAgent();
  const [assigningTo, setAssigningTo] = useState<string | null>(null);

  // Use appropriate agents based on view
  const agents = showGPSView ? gpsAgents : locationAgents;
  const isLoading = showGPSView ? gpsLoading : locationLoading;

  const handleAssign = async (agentId: string) => {
    setAssigningTo(agentId);
    try {
      await assignOrder.mutateAsync({ orderId, agentId });
      onOpenChange(false);
      setShowGPSView(false); // Reset view on close
    } finally {
      setAssigningTo(null);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setShowGPSView(false); // Reset view on close
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Delivery Agent</DialogTitle>
          <DialogDescription>
            {showGPSView 
              ? 'Showing agents within 10km of your location.'
              : 'Select an agent to assign this order. Capacity limits can be overridden.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* View Toggle */}
        {showGPSView ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowGPSView(false)}
            className="w-full flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assigned Agents
          </Button>
        ) : (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setShowGPSView(true)}
            className="w-full flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Find New Agents in 10km Range
          </Button>
        )}

        {showGPSView && (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <MapPin className="h-3 w-3" />
            GPS-based (10km radius)
          </Badge>
        )}

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : agents && agents.length > 0 ? (
            agents.map((agent) => {
              const isAtCapacity = agent.available_slots <= 0;
              const isAssigning = assigningTo === agent.agent_id;

              return (
                <div
                  key={agent.agent_id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {showGPSView && agent.distance_km && (
                          <>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {agent.distance_km.toFixed(1)} km
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>
                          {agent.orders_tomorrow} / {agent.max_capacity} orders
                        </span>
                        {isAtCapacity && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            At Capacity
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isAtCapacity ? 'outline' : 'default'}
                    onClick={() => handleAssign(agent.agent_id)}
                    disabled={isAssigning}
                  >
                    {isAssigning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Assign'
                    )}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {showGPSView 
                ? 'No delivery agents found within 10km of your location.'
                : 'No delivery agents assigned to this location.'
              }
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={onCreateNewAgent}>
            Create New Agent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
