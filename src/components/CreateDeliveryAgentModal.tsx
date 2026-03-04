import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateDeliveryAgent, useAssignOrderToAgent } from '@/hooks/useManualAgentAssignment';
import { Loader2 } from 'lucide-react';

interface CreateDeliveryAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: number;
  pendingOrderId?: string;
}

export function CreateDeliveryAgentModal({
  open,
  onOpenChange,
  locationId,
  pendingOrderId,
}: CreateDeliveryAgentModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(30);

  const createAgent = useCreateDeliveryAgent();
  const assignOrder = useAssignOrderToAgent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      return;
    }

    try {
      const newAgent = await createAgent.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        locationId,
        maxCapacity,
      });

      // Auto-assign pending order if provided
      if (pendingOrderId && newAgent) {
        await assignOrder.mutateAsync({
          orderId: pendingOrderId,
          agentId: newAgent.id,
        });
      }

      // Reset form and close
      setName('');
      setEmail('');
      setPhone('');
      setMaxCapacity(30);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const isLoading = createAgent.isPending || assignOrder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Delivery Partner</DialogTitle>
          <DialogDescription>
            Add a new delivery partner to your location.
            {pendingOrderId && ' The order will be automatically assigned to this agent.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter agent name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location ID</Label>
            <Input
              id="location"
              value={locationId}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Max Capacity (Orders/Day)</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              max={100}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 30)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !email.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : pendingOrderId ? (
                'Create & Assign'
              ) : (
                'Create Agent'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
