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

    // Subscribe to agent notifications with enhanced filtering
    const agentNotificationsChannel = supabase
      .channel('agent-notifications-enhanced')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_notifications'
        },
        (payload) => {
          const notification = payload.new;
          console.log('🚚 AgentNotifications: Received notification:', notification);
          console.log('🚚 AgentNotifications: User ID match check:', {
            notification_agent_id: notification.agent_id,
            current_user_id: user.id,
            matches: notification.agent_id === user.id
          });
          
          // Only show notifications for this specific agent
          if (notification.agent_id !== user.id) {
            console.log('🚚 AgentNotifications: Skipping notification - not for this agent');
            return;
          }
          
          console.log('🚚 AgentNotifications: Processing notification for agent:', notification.type);
          
          // Play appropriate sound based on notification type
          console.log('🚚 AgentNotifications: Playing sound for type:', notification.type);
          switch (notification.type) {
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

    // Also subscribe to regular notifications table for agent-specific messages
    const regularNotificationsChannel = supabase
      .channel('agent-regular-notifications')
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
          console.log('🚚 AgentNotifications: Received regular notification:', notification);
          
          // Only process delivery-related notifications
          if (notification.role === 'agent' || notification.type?.includes('delivery')) {
            console.log('🚚 AgentNotifications: Processing delivery notification');
            
            notificationSound.playNotificationSound('order');
            
            toast({
              title: notification.title,
              description: notification.message,
              duration: 8000,
              className: "bg-blue-600 text-white border-blue-600"
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🚚 AgentNotifications: Cleaning up subscriptions');
      supabase.removeChannel(agentNotificationsChannel);
      supabase.removeChannel(regularNotificationsChannel);
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