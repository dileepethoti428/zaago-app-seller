import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Eye, CheckCircle, VolumeX } from 'lucide-react';
import { stopContinuousRinging } from '@/utils/notificationSound';

interface NewOrderNotificationModalProps {
  order: {
    id: string;
    customer_name?: string;
    total_amount?: number;
    items?: Array<{ name: string; quantity: number }>;
    delivery_address?: string;
  };
  onAccept: () => void;
  onDismiss: () => void;
  onViewOrder: () => void;
}

export const NewOrderNotificationModal: React.FC<NewOrderNotificationModalProps> = ({
  order,
  onAccept,
  onDismiss,
  onViewOrder
}) => {
  const handleAction = (action: () => void) => {
    stopContinuousRinging();
    action();
  };

  const handleStopRingtone = () => {
    stopContinuousRinging();
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-background border-2 border-primary shadow-2xl animate-pulse">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-6 w-6 text-primary animate-bounce" />
              <h2 className="text-xl font-bold text-primary">New Order!</h2>
            </div>
            <Badge variant="destructive" className="animate-pulse">
              URGENT
            </Badge>
          </div>

          {/* Order Details */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="font-medium">Order ID:</span>
              <span className="text-primary font-mono">#{order.id.slice(-6)}</span>
            </div>
            
            {order.customer_name && (
              <div className="flex justify-between">
                <span className="font-medium">Customer:</span>
                <span>{order.customer_name}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="font-medium">Amount:</span>
              <span className="text-primary font-bold text-lg">
                {formatAmount(order.total_amount)}
              </span>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="space-y-1">
                <span className="font-medium">Items:</span>
                <div className="text-sm text-muted-foreground">
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={index}>
                      {item.quantity}x {item.name}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-xs">+{order.items.length - 3} more items</div>
                  )}
                </div>
              </div>
            )}

            {order.delivery_address && (
              <div className="space-y-1">
                <span className="font-medium">Address:</span>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {order.delivery_address}
                </p>
              </div>
            )}
          </div>

          {/* Stop Ringtone Button */}
          <Button
            onClick={handleStopRingtone}
            variant="secondary"
            className="w-full flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <VolumeX className="h-4 w-4" />
            Stop Ringtone
          </Button>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAction(onAccept)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Accept
            </Button>
            <Button
              onClick={() => handleAction(onViewOrder)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          </div>

          {/* Dismiss Button */}
          <Button
            onClick={() => handleAction(onDismiss)}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-destructive flex items-center gap-2"
          >
            <PhoneOff className="h-4 w-4" />
            Dismiss
          </Button>
        </div>
      </Card>
    </div>
  );
};