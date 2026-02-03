import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const channels: any[] = [];

    // Cart items real-time sync - only UPDATE events
    const cartChannel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate cart queries when cart items change
          queryClient.invalidateQueries({ queryKey: ['cart', user.id] });
        }
      )
      .subscribe();

    channels.push(cartChannel);

    // Orders real-time sync - only UPDATE events for status changes
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_phone=eq.${user.phone}`,
        },
        (payload) => {
          // Invalidate orders queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          
          // Show toast for order status changes
          if (payload.new.status !== payload.old?.status) {
            const statusMessages: Record<string, string> = {
              'confirmed': 'Your order has been confirmed!',
              'preparing': 'Your order is being prepared',
              'packed': 'Your order has been packed',
              'out_for_delivery': 'Your order is out for delivery',
              'delivered': 'Your order has been delivered!',
              'cancelled': 'Your order has been cancelled',
            };

            const message = statusMessages[payload.new.status];
            if (message) {
              toast({
                title: "Order Update",
                description: message,
              });
            }
          }
        }
      )
      .subscribe();

    channels.push(ordersChannel);

    // Products are now handled by React Query refetchOnWindowFocus
    // No need for real-time subscription - reduces 500+ events/hour

    // Vacation compensations real-time sync
    const compensationsChannel = supabase
      .channel('compensations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vacation_compensations',
        },
        () => {
          // Invalidate compensation queries
          queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
          queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
          queryClient.invalidateQueries({ queryKey: ['vacation-dates-status'] });
        }
      )
      .subscribe();

    channels.push(compensationsChannel);
    // Notifications real-time sync
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate notifications queries
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          // Show toast for new notifications
          if (payload.new.type !== 'system') {
            toast({
              title: payload.new.title,
              description: payload.new.message,
            });
          }
        }
      )
      .subscribe();

    channels.push(notificationsChannel);

    // Cleanup function
    return () => {
      channels.forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [user, queryClient, toast]);

  // Method to manually sync all data
  const syncAllData = () => {
    queryClient.invalidateQueries();
  };

  return {
    syncAllData,
  };
};