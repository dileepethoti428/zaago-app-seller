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

    console.log('🚚 AgentNotifications: Setting up subscriptions for user:', user.id);

    // Subscribe to agent notifications with server-side filtering
    const agentNotificationsChannel = supabase
      .channel(`agent-notifications-${user.id}-${Date.now()}`)
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
          console.log('🚚 AgentNotifications: Received notification:', notification);
          
          console.log('🚚 AgentNotifications: Processing notification for agent:', notification.type);
          
          // Play appropriate sound based on notification type - SINGLE SOUND ONLY
          console.log('🚚 AgentNotifications: Playing sound for type:', notification.type);
          switch (notification.type) {
            case 'new_order':
            case 'new_delivery_assignment':
            case 'new_delivery_available':
              notificationSound.playNotificationSound('rapido_ringtone');
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
      console.log('🚚 AgentNotifications: Cleaning up subscriptions');
      supabase.removeChannel(agentNotificationsChannel);
    };
  }, [user, toast]);

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'new_delivery_assignment':
      case 'new_delivery_available':
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