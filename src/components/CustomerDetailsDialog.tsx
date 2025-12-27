import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User, Phone, Mail, MapPin, Home } from 'lucide-react';

interface CustomerInfo {
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface CustomerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerInfo: CustomerInfo | null;
}

export const CustomerDetailsDialog = ({
  isOpen,
  onClose,
  customerInfo,
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
