import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, Home, Truck } from 'lucide-react';

interface CustomerInfo {
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  phone?: string | null;
  is_active?: boolean;
  is_online?: boolean;
}

interface CustomerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerInfo: CustomerInfo | null;
  assignedAgent?: AgentInfo | null;
}

export const CustomerDetailsDialog = ({
  isOpen,
  onClose,
  customerInfo,
  assignedAgent,
}: CustomerDetailsDialogProps) => {
  if (!customerInfo) return null;

  const fullAddress = [
    customerInfo.address,
    customerInfo.city,
    customerInfo.state,
    customerInfo.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogDescription>
            Full information about this customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{customerInfo.full_name || 'Not provided'}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-medium">{customerInfo.phone || 'Not provided'}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{customerInfo.email || 'Not provided'}</p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{fullAddress || 'Not provided'}</p>
            </div>
          </div>

          {/* Location details */}
          {(customerInfo.city || customerInfo.state || customerInfo.pincode) && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="grid grid-cols-3 gap-4 flex-1">
                {customerInfo.city && (
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{customerInfo.city}</p>
                  </div>
                )}
                {customerInfo.state && (
                  <div>
                    <p className="text-sm text-muted-foreground">State</p>
                    <p className="font-medium">{customerInfo.state}</p>
                  </div>
                )}
                {customerInfo.pincode && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pincode</p>
                    <p className="font-medium">{customerInfo.pincode}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assigned Delivery Agent */}
          <div className="flex items-start gap-3 pt-2 border-t border-border">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Assigned Delivery Agent</p>
              {assignedAgent ? (
                <div className="space-y-1">
                  <p className="font-medium">{assignedAgent.name}</p>
                  {assignedAgent.phone && (
                    <p className="text-sm text-muted-foreground">📱 {assignedAgent.phone}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={
                        assignedAgent.is_online
                          ? 'bg-green-500/20 text-green-500 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }
                    >
                      {assignedAgent.is_online ? '🟢 Online' : '⚫ Offline'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        assignedAgent.is_active
                          ? 'bg-blue-500/20 text-blue-500 border-blue-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {assignedAgent.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="font-medium text-yellow-500">Not assigned</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
