import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';

export const AgentNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Subscribe to agent notifications
    const agentNotificationsChannel = supabase
      .channel('agent-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_notifications',
          filter: `agent_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new;
          
          // Play appropriate sound based on notification type
          switch (notification.type) {
            case 'new_delivery_assignment':
              notificationSound.playNotificationSound('order');
              break;
            case 'delivery_completed':
              notificationSound.playNotificationSound('success');
              break;
            case 'urgent':
              notificationSound.playNotificationSound('urgent');
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
      supabase.removeChannel(agentNotificationsChannel);
    };
  }, [user, toast]);

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'new_delivery_assignment':
        return "bg-blue-600 text-white border-blue-600";
      case 'delivery_completed':
        return "bg-green-600 text-white border-green-600";
      case 'urgent':
        return "bg-red-600 text-white border-red-600";
      default:
        return "bg-primary text-primary-foreground border-primary";
    }
  };

  return null; // This component doesn't render anything
};