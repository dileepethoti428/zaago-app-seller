import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';

export const SellerNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Subscribe to notifications for this seller
    const notificationsChannel = supabase
      .channel('seller-notifications')
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
            case 'new_order':
              notificationSound.playNotificationSound('phone_ringtone');
              break;
            case 'order_cancelled':
              notificationSound.playNotificationSound('urgent');
              break;
            case 'payment_received':
              notificationSound.playNotificationSound('payment');
              break;
            case 'delivery_completed':
              notificationSound.playNotificationSound('success');
              break;
            default:
              notificationSound.playNotificationSound('system');
          }
          
          toast({
            title: notification.title,
            description: notification.message,
            duration: 8000,
            className: getToastStyles(notification.type)
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, toast]);

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'new_order':
        return "bg-green-600 text-white border-green-600";
      case 'order_cancelled':
        return "bg-red-600 text-white border-red-600";
      case 'payment_received':
        return "bg-purple-600 text-white border-purple-600";
      case 'delivery_completed':
        return "bg-blue-600 text-white border-blue-600";
      default:
        return "bg-primary text-primary-foreground border-primary";
    }
  };

  return null; // This component doesn't render anything
};