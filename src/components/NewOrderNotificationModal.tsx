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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-md bg-background border-4 border-red-500 shadow-2xl"
            style={{
              boxShadow: '0 0 50px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.1)'
            }}>
        <div className="p-6 space-y-4 relative">
          {/* Emergency Header */}
          <div className="flex items-center justify-between bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border-2 border-red-500">
            <div className="flex items-center gap-2">
              <Phone className="h-8 w-8 text-red-600" />
              <div>
                <h2 className="text-2xl font-bold text-red-600">🚨 NEW ORDER!</h2>
                <p className="text-sm text-red-500 font-medium">IMMEDIATE ACTION REQUIRED</p>
              </div>
            </div>
            <Badge variant="destructive" className="text-lg px-4 py-2">
              EMERGENCY
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

          {/* EMERGENCY ACTION BUTTONS */}
          <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg border-2 border-yellow-500">
            <p className="text-center text-yellow-800 dark:text-yellow-200 font-bold mb-3 text-lg">
              🔊 LOUD RINGTONE PLAYING 🔊
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleStopRingtone}
                variant="secondary"
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-lg py-4"
              >
                <VolumeX className="h-5 w-5" />
                STOP ALARM
              </Button>
              <Button
                onClick={() => handleAction(onDismiss)}
                variant="destructive"
                className="flex items-center gap-2 text-lg py-4"
              >
                <PhoneOff className="h-5 w-5" />
                DISMISS
              </Button>
            </div>
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

          {/* PRIMARY ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAction(onAccept)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-lg py-6"
            >
              <CheckCircle className="h-6 w-6" />
              ACCEPT ORDER
            </Button>
            <Button
              onClick={() => handleAction(onViewOrder)}
              variant="outline"
              className="flex items-center gap-2 text-lg py-6 border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Eye className="h-6 w-6" />
              VIEW DETAILS
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};