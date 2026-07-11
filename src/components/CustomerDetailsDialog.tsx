import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, Home, Truck, Package } from 'lucide-react';
import { useSubscriptionDeliveryHistory } from '@/hooks/useSubscriptionDeliveryHistory';
import { SubscriptionDeliveryCalendar } from '@/components/SubscriptionDeliveryCalendar';
import { CompensationAssignmentDialog } from '@/components/CompensationAssignmentDialog';

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

interface SubscriptionInfo {
  id: string;
  customer_id?: string;
  product_id?: string;
  product_name?: string;
  product_unit?: string;
  quantity?: number;
}

interface CustomerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerInfo: CustomerInfo | null;
  assignedAgent?: AgentInfo | null;
  subscriptionInfo?: SubscriptionInfo | null;
}

export const CustomerDetailsDialog = ({
  isOpen,
  onClose,
  customerInfo,
  assignedAgent,
  subscriptionInfo,
}: CustomerDetailsDialogProps) => {
  const [compensationDialog, setCompensationDialog] = useState<{
    open: boolean;
    missedDate: string;
    dailyOrderId: string | null;
  }>({ open: false, missedDate: '', dailyOrderId: null });

  const { data: history, isLoading: historyLoading } = useSubscriptionDeliveryHistory(
    subscriptionInfo?.id || null
  );

  if (!customerInfo) return null;

  const fullAddress = [
    customerInfo.address,
    customerInfo.city,
    customerInfo.state,
    customerInfo.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const hasCalendar = !!subscriptionInfo?.id;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Full information about this customer
            </DialogDescription>
          </DialogHeader>

          {hasCalendar ? (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="calendar" className="flex-1">Delivery Calendar</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <CustomerDetailFields
                  customerInfo={customerInfo}
                  fullAddress={fullAddress}
                  assignedAgent={assignedAgent}
                  subscriptionInfo={subscriptionInfo}
                />
              </TabsContent>

              <TabsContent value="calendar">
                <SubscriptionDeliveryCalendar
                  history={history || {}}
                  isLoading={historyLoading}
                  onMissedDateClick={(date, dailyOrderId) => {
                    setCompensationDialog({ open: true, missedDate: date, dailyOrderId });
                  }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <CustomerDetailFields
              customerInfo={customerInfo}
              fullAddress={fullAddress}
              assignedAgent={assignedAgent}
              subscriptionInfo={subscriptionInfo}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Compensation Assignment Dialog */}
      {subscriptionInfo && compensationDialog.open && compensationDialog.missedDate && (
        <CompensationAssignmentDialog
          open={compensationDialog.open}
          onOpenChange={(open) => setCompensationDialog(prev => ({ ...prev, open }))}
          missedDate={compensationDialog.missedDate}
          subscriptionId={subscriptionInfo.id}
          customerId={subscriptionInfo.customer_id || ''}
          productId={subscriptionInfo.product_id || ''}
          productName={subscriptionInfo.product_name || 'Unknown Product'}
          customerName={customerInfo.full_name || 'Unknown'}
          quantity={subscriptionInfo.quantity || 1}
        />
      )}
    </>
  );
};

// Extracted detail fields component
const CustomerDetailFields = ({
  customerInfo,
  fullAddress,
  assignedAgent,
  subscriptionInfo,
}: {
  customerInfo: CustomerInfo;
  fullAddress: string;
  assignedAgent?: AgentInfo | null;
  subscriptionInfo?: SubscriptionInfo | null;
}) => (
  <div className="space-y-4 py-4">
    {/* Product */}
    {subscriptionInfo && (
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Package className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Subscribed Product</p>
          <p className="font-medium">
            {subscriptionInfo.product_name || 'Unknown Product'}
            {subscriptionInfo.product_unit ? ` ${subscriptionInfo.product_unit}` : ''}
            {` x${subscriptionInfo.quantity ?? 1}`}
          </p>
        </div>
      </div>
    )}

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
        <p className="text-sm text-muted-foreground">Assigned Delivery Partner</p>
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
);
