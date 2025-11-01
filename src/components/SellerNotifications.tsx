import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';
import { NewOrderNotificationModal } from './NewOrderNotificationModal';
import { Badge } from '@/components/ui/badge';
import { useDelayedNotification } from '@/hooks/useDelayedNotification';

export const SellerNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { scheduleNotification, cancelNotification, cancelAllNotifications, getPendingCount, pendingNotifications } = useDelayedNotification();
  const [newOrderModal, setNewOrderModal] = useState<{
    visible: boolean;
    order: any;
  }>({ visible: false, order: null });
  const [escalationLevel, setEscalationLevel] = useState(0);
  const [missedNotificationCount, setMissedNotificationCount] = useState(0);
  const channelRef = useRef<any>(null);
  const orderStatusChannelRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const escalationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processedNotifications = useRef<Set<string>>(new Set());

  // Progressive escalation effect
  useEffect(() => {
    if (!newOrderModal.visible) {
      setEscalationLevel(0);
      if (escalationTimerRef.current) {
        clearTimeout(escalationTimerRef.current);
        escalationTimerRef.current = null;
      }
      notificationSound.stopContinuousRinging();
      return;
    }

    setEscalationLevel(1);

    const stage2Timer = setTimeout(() => {
      setEscalationLevel(2);
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
    }, 10000);

    const stage3Timer = setTimeout(() => {
      setEscalationLevel(3);
      if ('vibrate' in navigator) {
        const vibrateInterval = setInterval(() => {
          navigator.vibrate([500, 200, 500]);
        }, 2000);
        escalationTimerRef.current = vibrateInterval as any;
      }
    }, 20000);

    return () => {
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      if (escalationTimerRef.current) {
        clearInterval(escalationTimerRef.current);
        escalationTimerRef.current = null;
      }
    };
  }, [newOrderModal.visible]);

  // Check for unread notifications
  const checkForUnreadNotifications = useCallback(async () => {
    if (!user) return;
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    try {
      const { data: unreadNotifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'new_order')
        .eq('role', 'seller')
        .eq('is_read', false)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error checking unread notifications:', error);
        return;
      }

      if (unreadNotifications && unreadNotifications.length > 0) {
        console.log('📬 Found', unreadNotifications.length, 'unread notifications');
        setMissedNotificationCount(unreadNotifications.length);
        
        // Process first unprocessed notification
        for (const notif of unreadNotifications) {
          if (!processedNotifications.current.has(notif.id)) {
            console.log('🔔 Processing unread notification:', notif.id);
            await handleNotification(notif);
            processedNotifications.current.add(notif.id);
            break;
          }
        }
      } else {
        setMissedNotificationCount(0);
      }
    } catch (error) {
      console.error('❌ Failed to check unread notifications:', error);
    }
  }, [user]);

  // Handle showing the modal after delay
  const showDelayedModal = useCallback(async (notification: any) => {
    const orderId = notification.order_id || notification.metadata?.order_id;
    const metadata = notification.metadata || {};
    
    let orderDetails = {
      id: orderId || 'unknown',
      customer_name: metadata.customer_name || 'New Customer',
      customer_phone: metadata.customer_phone || '',
      total_amount: metadata.seller_total || metadata.total_amount || 0,
      items: metadata.seller_items || metadata.items || [],
      delivery_address: metadata.delivery_address || metadata.address || '',
      payment_method: metadata.payment_method || 'COD',
      payment_status: metadata.payment_status || 'pending',
    };
    
    // Fetch complete order if possible
    if (orderId && orderId !== 'unknown') {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (order) {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
          
          orderDetails = {
            id: order.id,
            customer_name: order.customer_name || orderDetails.customer_name,
            customer_phone: order.customer_phone || orderDetails.customer_phone,
            total_amount: order.total || orderDetails.total_amount,
            items: items.length > 0 ? items : orderDetails.items,
            delivery_address: typeof order.address === 'string' ? order.address : 
              `${(order.address as any)?.full_address || ''}, ${(order.address as any)?.city || ''}`.trim(),
            payment_method: (order as any).payment_method || orderDetails.payment_method,
            payment_status: (order as any).payment_status || orderDetails.payment_status,
          };
        }
      } catch (error) {
        console.error('❌ Error fetching order:', error);
      }
    }
    
    // NOW play sound and show alerts (after 10 second delay)
    console.log('🚨 10 SECONDS PASSED - SHOWING URGENT NOTIFICATION');
    
    try {
      await notificationSound.ensureAudioContext();
      notificationSound.setVolume(1.0);
      notificationSound.startContinuousRinging('rapido_ringtone');
    } catch (error) {
      console.error('❌ Audio error:', error);
    }
    
    // Browser notification
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      if (Notification.permission === 'granted') {
        const notif = new Notification('🚨 NEW ORDER - RESPOND NOW!', {
          body: 'New Order Received! Please respond to the order request.',
          icon: '/zaago-logo.png',
          tag: 'new-order-urgent',
          requireInteraction: true,
        });
        
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    }
    
    // Vibration
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500, 200, 1000]);
    }
    
    console.log('📦 Showing modal with order:', orderDetails);
    setNewOrderModal({ visible: true, order: orderDetails });
    
    // Mark as read
    if (notification.id) {
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id)
        .then(() => console.log('✅ Notification marked as read'));
    }
  }, []);

  // Handle notification - schedule for delayed display
  const handleNotification = useCallback(async (notification: any) => {
    console.log('🔔 Processing notification:', notification);
    
    if (notification.type === 'new_order') {
      console.log('🚨 NEW ORDER NOTIFICATION - Scheduling for 10 seconds');
      
      // Schedule to show after 10 seconds
      scheduleNotification(notification, showDelayedModal, 10000);
    }
  }, [scheduleNotification, showDelayedModal]);

  // Polling function - check every 5 seconds
  const checkForNewNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'new_order')
        .eq('role', 'seller')
        .eq('is_read', false)
        .order('created_at', { ascending: false})
        .limit(5);

      if (error) {
        console.error('❌ Polling error:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log('📬 Polling found', data.length, 'notifications');
        
        for (const notification of data) {
          if (!processedNotifications.current.has(notification.id)) {
            console.log('🔔 Processing notification from polling:', notification.id);
            await handleNotification(notification);
            processedNotifications.current.add(notification.id);
          }
        }
      }
    } catch (error) {
      console.error('❌ Polling failed:', error);
    }
  }, [user, handleNotification]);

  // Setup real-time subscription for notifications
  const setupSubscription = useCallback(async () => {
    if (!user) return;
    
    console.log('🔔 Setting up real-time subscription');
    notificationSound.ensureAudioContext();
    
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const channel = supabase.channel('seller-notifications');
    
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('🔔 Real-time notification:', payload.new);
        if (payload.new && !processedNotifications.current.has(payload.new.id)) {
          handleNotification(payload.new);
          processedNotifications.current.add(payload.new.id);
        }
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
    
    channelRef.current = channel;
  }, [user, handleNotification]);

  // Setup order status monitoring to cancel delayed notifications
  const setupOrderStatusMonitoring = useCallback(async () => {
    if (!user) return;
    
    console.log('🔔 Setting up order status monitoring');
    
    if (orderStatusChannelRef.current) {
      await supabase.removeChannel(orderStatusChannelRef.current);
      orderStatusChannelRef.current = null;
    }
    
    const channel = supabase.channel('order-status-updates');
    
    channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        const orderId = payload.new.id;
        const newStatus = (payload.new as any).status;
        
        console.log('📝 Order status updated:', orderId, newStatus);
        
        // Cancel pending notification if order status changed from 'placed'
        if (newStatus !== 'placed') {
          const cancelled = cancelNotification(orderId);
          if (cancelled) {
            console.log('✅ Cancelled delayed notification for order:', orderId);
          }
        }
      })
      .subscribe((status) => {
        console.log('📡 Order status subscription status:', status);
      });
    
    orderStatusChannelRef.current = channel;
  }, [user, cancelNotification]);

  // Main effect - start both real-time and immediate polling
  useEffect(() => {
    if (!user) return;

    console.log('🚀 Starting notification system with immediate 5s polling');
    
    // Check for unread notifications on load
    checkForUnreadNotifications();
    
    // Start polling immediately
    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      // Check immediately
      checkForNewNotifications();
      
      // Poll every 5 seconds
      pollingIntervalRef.current = setInterval(() => {
        checkForNewNotifications();
      }, 5000);
      
      console.log('✅ 5-second polling active');
    };

    startPolling();
    setupSubscription();
    setupOrderStatusMonitoring();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (orderStatusChannelRef.current) {
        supabase.removeChannel(orderStatusChannelRef.current);
        orderStatusChannelRef.current = null;
      }
      
      // Cancel all pending notifications on unmount
      cancelAllNotifications();
    };
  }, [user, setupSubscription, setupOrderStatusMonitoring, checkForNewNotifications, checkForUnreadNotifications, cancelAllNotifications]);

  const handleAcceptOrder = () => {
    console.log('✅ Order accepted');
    notificationSound.stopContinuousRinging();
    
    // Cancel any pending delayed notifications for this order
    if (newOrderModal.order?.id) {
      cancelNotification(newOrderModal.order.id);
    }
    
    setNewOrderModal({ visible: false, order: null });
    
    toast({
      title: "Order Accepted",
      description: "You've accepted the order",
      duration: 3000,
    });
  };

  const handleDismissOrder = () => {
    console.log('❌ Order dismissed');
    notificationSound.stopContinuousRinging();
    
    // Cancel any pending delayed notifications for this order
    if (newOrderModal.order?.id) {
      cancelNotification(newOrderModal.order.id);
    }
    
    setNewOrderModal({ visible: false, order: null });
  };

  const handleViewOrder = () => {
    console.log('👁️ View order');
    notificationSound.stopContinuousRinging();
    
    // Cancel any pending delayed notifications for this order
    if (newOrderModal.order?.id) {
      cancelNotification(newOrderModal.order.id);
    }
    
    setNewOrderModal({ visible: false, order: null });
    
    if (newOrderModal.order?.id) {
      window.location.href = `/orders/${newOrderModal.order.id}`;
    }
  };

  const pendingCount = getPendingCount();

  return (
    <>
      {/* Pending notifications indicator */}
      {pendingCount > 0 && (
        <div className="fixed bottom-20 right-4 z-50">
          <Badge variant="outline" className="text-sm px-3 py-2 bg-orange-500/20 border-orange-500 animate-pulse">
            ⏰ {pendingCount} pending notification{pendingCount > 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Missed notification badge */}
      {missedNotificationCount > 0 && (
        <div className="fixed top-20 right-4 z-50 animate-pulse">
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {missedNotificationCount} Unread Order{missedNotificationCount > 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* New order modal */}
      {newOrderModal.visible && newOrderModal.order && (
        <>
          <div className="fixed inset-0 bg-black/90 z-[100] animate-fade-in" />
          <NewOrderNotificationModal
            order={newOrderModal.order}
            onAccept={handleAcceptOrder}
            onDismiss={handleDismissOrder}
            onViewOrder={handleViewOrder}
          />
        </>
      )}
    </>
  );
};
