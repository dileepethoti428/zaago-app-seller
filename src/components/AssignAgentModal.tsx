import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAssignPrimaryAgent } from '@/hooks/useAssignPrimaryAgent';
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

import { Loader2, MapPin, User } from 'lucide-react';

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
  const { mutate: assignAgent, isPending: isAssigning } = useAssignPrimaryAgent();

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId(null);
    }
  }, [isOpen]);

  // Fetch delivery agents by location
  const { data: agents, isLoading } = useQuery({
    queryKey: ['delivery-agents-by-location', locationId],
    queryFn: async () => {
      if (!locationId) return [];

      const { data, error } = await supabase
        .from('delivery_agents')
        .select('id, name, location_id')
        .eq('location_id', locationId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!locationId,
  });

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Delivery Agent</DialogTitle>
          <DialogDescription>
            Select a delivery agent for this subscription. This is a one-time assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !agents || agents.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No active delivery agents found for location ID: {locationId}
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto pr-2">
              <RadioGroup
                value={selectedAgentId || ''}
                onValueChange={setSelectedAgentId}
                className="space-y-3"
              >
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAgentId === agent.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    <RadioGroupItem value={agent.id} id={agent.id} />
                    <Label
                      htmlFor={agent.id}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{agent.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>Location: {agent.location_id}</span>
                      </div>
                    </Label>
                  </div>
                ))}
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
