import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Test component to simulate delivery agent and receive notifications
export const DeliveryAgentTestNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    console.log('🚚 TEST: Setting up delivery agent test notifications');

    // Subscribe to all agent notifications for testing
    const testChannel = supabase
      .channel('test-agent-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_notifications'
        },
        (payload) => {
          const notification = payload.new;
          console.log('🚚 TEST: Received agent notification:', notification);
          
          if (notification.type === 'new_delivery_available') {
            toast({
              title: "🚚 TEST: New Delivery Alert",
              description: `${notification.title} - ${notification.message}`,
              duration: 10000,
              className: "bg-green-600 text-white border-green-600"
            });
          }
        }
      )
      .subscribe();

    // Also listen to regular notifications for agents
    const regularChannel = supabase
      .channel('test-regular-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const notification = payload.new;
          console.log('🚚 TEST: Received regular notification:', notification);
          
          if (notification.role === 'agent') {
            toast({
              title: "🚚 TEST: Agent Notification",
              description: `${notification.title} - ${notification.message}`,
              duration: 10000,
              className: "bg-blue-600 text-white border-blue-600"
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🚚 TEST: Cleaning up test subscriptions');
      supabase.removeChannel(testChannel);
      supabase.removeChannel(regularChannel);
    };
  }, [toast]);

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white p-2 rounded text-xs">
      🚚 Delivery Agent Test Mode Active
    </div>
  );
};