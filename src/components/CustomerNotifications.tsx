import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';

export const CustomerNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Subscribe to customer notifications
    const customerNotificationsChannel = supabase
      .channel(`customer-notifications-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new;
          
          // Play appropriate sound based on notification type
          switch (notification.type) {
            case 'order_confirmed':
            case 'order_accepted':
              notificationSound.playNotificationSound('rapido_ringtone');
              break;
            case 'order_packed':
            case 'order_shipped':
              notificationSound.playNotificationSound('delivery');
              break;
            case 'order_delivered':
              notificationSound.playNotificationSound('success');
              break;
            case 'payment_confirmed':
            case 'payment_received':
              notificationSound.playNotificationSound('payment');
              break;
            case 'order_cancelled':
            case 'order_rejected':
              notificationSound.playNotificationSound('urgent');
              break;
            default:
              notificationSound.playNotificationSound('system');
          }
          
          toast({
            title: notification.title,
            description: notification.message,
            duration: 6000,
            className: getToastStyles(notification.type)
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(customerNotificationsChannel);
    };
  }, [user, toast]);

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'order_confirmed':
      case 'order_accepted':
      case 'order_packed':
      case 'order_shipped':
        return "bg-blue-600 text-white border-blue-600";
      case 'order_delivered':
        return "bg-green-600 text-white border-green-600";
      case 'payment_confirmed':
      case 'payment_received':
        return "bg-purple-600 text-white border-purple-600";
      case 'order_cancelled':
      case 'order_rejected':
        return "bg-red-600 text-white border-red-600";
      default:
        return "bg-primary text-primary-foreground border-primary";
    }
  };

  return null; // This component doesn't render anything
};