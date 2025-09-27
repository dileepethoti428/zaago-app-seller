import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Phone, PhoneOff, Eye, CheckCircle, VolumeX, Volume2, Play, Square, ChevronDown } from 'lucide-react';
import { notificationSound } from '@/utils/notificationSound';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [audioControlsOpen, setAudioControlsOpen] = useState(false);
  const [audioStatus, setAudioStatus] = useState<any>(null);

  useEffect(() => {
    const checkStatus = () => {
      const status = notificationSound.getAudioStatus();
      setAudioStatus(status);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = (action: () => void) => {
    notificationSound.stopContinuousRinging();
    action();
  };

  const handleStopRingtone = () => {
    notificationSound.stopContinuousRinging();
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toFixed(2)}`;
  };

  const testNewOrderRingtone = async () => {
    try {
      console.log('🔊 Testing new order ringtone...');
      await notificationSound.ensureAudioContext();
      notificationSound.startContinuousRinging('rapido_ringtone');
      
      toast({
        title: "New Order Ringtone Test",
        description: "Playing continuous ringtone for new order simulation",
        duration: 3000,
        className: "bg-green-600 text-white border-green-600"
      });
    } catch (error) {
      console.error('🔊 New order ringtone test failed:', error);
      toast({
        title: "Ringtone Test Failed",
        description: String(error),
        variant: "destructive"
      });
    }
  };

  const testBasicSound = async () => {
    try {
      await notificationSound.playNotificationSound('urgent');
      toast({
        title: "Basic Sound Test",
        description: "Playing basic urgent sound",
        duration: 2000
      });
    } catch (error) {
      console.error('Basic sound test failed:', error);
      toast({
        title: "Basic Sound Failed",
        description: String(error),
        variant: "destructive"
      });
    }
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

          {/* Emergency Stop Ringtone Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleStopRingtone}
              variant="secondary"
              className="flex-1 flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <VolumeX className="h-4 w-4" />
              Stop Sound
            </Button>
            <Button
              onClick={() => handleAction(onDismiss)}
              variant="destructive"
              className="flex-1 flex items-center gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              Cancel
            </Button>
          </div>

          {/* Audio Controls */}
          <Collapsible open={audioControlsOpen} onOpenChange={setAudioControlsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Audio Controls
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${audioControlsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="text-xs space-y-1 bg-muted/30 p-3 rounded-lg">
                <p><strong>Status:</strong> {audioStatus?.status}</p>
                <p><strong>Can Play:</strong> {audioStatus?.canPlay ? 'Yes' : 'No'}</p>
                <p><strong>Continuous Ringing:</strong> {audioStatus?.isContinuousRinging ? 'Active' : 'Inactive'}</p>
                {audioStatus?.message && <p><strong>Message:</strong> {audioStatus.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={testNewOrderRingtone}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs"
                >
                  <Play className="h-3 w-3" />
                  Test Ringtone
                </Button>
                
                <Button 
                  onClick={testBasicSound}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs"
                >
                  <Volume2 className="h-3 w-3" />
                  Test Basic Sound
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAction(onAccept)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Accept Order
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
        </div>
      </Card>
    </div>
  );
};