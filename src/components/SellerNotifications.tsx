import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';
import { NewOrderNotificationModal } from './NewOrderNotificationModal';
import { Button } from '@/components/ui/button';

export const SellerNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newOrderModal, setNewOrderModal] = useState<{
    visible: boolean;
    order: any;
  }>({ visible: false, order: null });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up notification subscription for user:', user.id);
    setConnectionStatus('connecting');

    // Initialize audio context early
    const initAudio = async () => {
      try {
        await notificationSound.ensureAudioContext();
        console.log('🔊 Audio context pre-initialized for notifications');
      } catch (error) {
        console.warn('🔊 Could not pre-initialize audio:', error);
      }
    };
    initAudio();

    // Subscribe to notifications for this seller with enhanced logging
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
        async (payload) => {
          const notification = payload.new;
          
          console.log('🔔 Raw notification received:', notification);
          
          // Handle new order notifications with MAXIMUM URGENCY
          if (notification.type === 'new_order') {
            console.log('🚨 CRITICAL: NEW ORDER NOTIFICATION! Initiating emergency alert sequence');
            console.log('🚨 Order ID:', notification.reference_id);
            console.log('🚨 Message:', notification.message);
            
            // IMMEDIATE VISUAL FEEDBACK - Show modal state change
            console.log('🚨 Setting modal visible state to TRUE');
            
            // IMMEDIATE AUDIO with multiple fallbacks
            const playEmergencyAudio = async () => {
              try {
                console.log('🚨 EMERGENCY AUDIO: Forcing audio context initialization');
                await notificationSound.ensureAudioContext();
                
                const audioStatus = notificationSound.getAudioStatus();
                console.log('🔊 Emergency audio status:', audioStatus);
                
                // Force maximum volume for emergency
                notificationSound.setVolume(0.8);
                
                // Start continuous high-volume ringing IMMEDIATELY
                console.log('🚨 STARTING MAXIMUM VOLUME CONTINUOUS RINGING');
                notificationSound.startContinuousRinging('rapido_ringtone');
                
                // Also play immediate urgent sound
                await notificationSound.playNotificationSound('urgent');
                
                // If audio is blocked, show urgent prompt
                if (!audioStatus.canPlay) {
                  console.warn('🚨 AUDIO BLOCKED - SHOWING URGENT INTERACTION PROMPT');
                  toast({
                    title: "🚨 URGENT: ENABLE SOUND!",
                    description: "NEW ORDER ALERT - Click to enable emergency audio!",
                    duration: 30000,
                    className: "bg-red-600 text-white border-red-600 text-xl font-bold animate-pulse cursor-pointer",
                    onClick: async () => {
                      await notificationSound.ensureAudioContext();
                      notificationSound.startContinuousRinging('rapido_ringtone');
                    }
                  });
                }
                
              } catch (error) {
                console.error('🚨 EMERGENCY AUDIO FAILED:', error);
                // Fallback: at least try vibration
                if ('vibrate' in navigator) {
                  navigator.vibrate([1000, 500, 1000, 500, 1000, 500, 1000]);
                }
              }
            };
            
            // Execute emergency audio immediately
            playEmergencyAudio();
            
            // BROWSER NOTIFICATION with maximum urgency
            const showEmergencyNotification = async () => {
              if ('Notification' in window) {
                if (Notification.permission === 'default') {
                  await Notification.requestPermission();
                }
                
                if (Notification.permission === 'granted') {
                  const notif = new Notification('🚨🚨 EMERGENCY: NEW ORDER! 🚨🚨', {
                    body: `URGENT ACTION REQUIRED: Customer order #${notification.reference_id?.slice(-6) || 'Unknown'}`,
                    icon: '/zaago-logo.png',
                    badge: '/zaago-logo.png',
                    tag: 'emergency-order',
                    requireInteraction: true,
                    silent: false
                  });
                  
                  notif.onclick = () => {
                    window.focus();
                    notif.close();
                  };
                }
              }
            };
            
            showEmergencyNotification();
            
            // VIBRATION for mobile devices
            if ('vibrate' in navigator) {
              navigator.vibrate([500, 200, 500, 200, 500, 200, 1000]);
            }
            
            // Try to fetch order details for the modal
            let orderDetails = {
              id: notification.reference_id || 'N/A',
              customer_name: 'New Customer',
              total_amount: 0,
              items: [],
              delivery_address: ''
            };

            if (notification.reference_id) {
              try {
                const { data: order } = await supabase
                  .from('orders')
                  .select(`
                    *,
                    order_items (
                      quantity,
                      product_variants (
                        products (name)
                      )
                    ),
                    customer_profiles (display_name)
                  `)
                  .eq('id', notification.reference_id)
                  .single();

                if (order) {
                  orderDetails = {
                    id: order.id,
                    customer_name: order.customer_name || 'Customer',
                    total_amount: 0,
                    items: order.order_items?.map((item: any) => ({
                      name: item.product_variants?.products?.name || 'Product',
                      quantity: item.quantity
                    })) || [],
                    delivery_address: order.customer_phone || ''
                  };
                }
              } catch (error) {
                console.error('Error fetching order details:', error);
              }
            }

            // SHOW MODAL with enhanced logging
            console.log('🚨 SHOWING NEW ORDER MODAL with order details:', orderDetails);
            setNewOrderModal({ visible: true, order: orderDetails });
            console.log('🚨 Modal state set - should be visible now!');
            
          } else {
            // Handle other notification types normally
            switch (notification.type) {
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
          }
          
          // Show enhanced toast for all notifications
          toast({
            title: notification.type === 'new_order' ? '🚨 URGENT: NEW ORDER!' : notification.title,
            description: notification.type === 'new_order' 
              ? `${notification.message} - Action required immediately!`
              : notification.message,
            duration: notification.type === 'new_order' ? 60000 : 8000, // Extra long duration for new orders
            className: getToastStyles(notification.type)
          });
        }
      )
      .subscribe((status) => {
        console.log('🔔 Subscription status changed:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          console.log('🔔 Successfully connected to notifications');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          console.error('🔔 Channel error - attempting reconnection');
        }
      });

    return () => {
      console.log('🔔 Cleaning up notification subscription');
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

  const handleAcceptOrder = () => {
    console.log('✅ Order accepted - stopping all notifications');
    
    // Stop continuous ringing immediately
    notificationSound.stopContinuousRinging();
    
    setNewOrderModal({ visible: false, order: null });
    
    // Here you would typically update the order status
    toast({
      title: "✅ Order Accepted",
      description: "You have accepted the new order successfully",
      className: "bg-green-600 text-white border-green-600",
      duration: 5000
    });
  };

  const handleDismissOrder = () => {
    console.log('❌ Order notification dismissed');
    
    // Stop continuous ringing
    notificationSound.stopContinuousRinging();
    
    setNewOrderModal({ visible: false, order: null });
  };

  const handleViewOrder = () => {
    console.log('👀 Viewing order details - stopping notifications');
    
    // Stop continuous ringing
    notificationSound.stopContinuousRinging();
    
    setNewOrderModal({ visible: false, order: null });
    // Here you would typically navigate to the order details page
    window.location.href = `/orders/${newOrderModal.order?.id}`;
  };

  // Add test notification function for debugging
  const testNewOrderNotification = () => {
    console.log('🧪 Testing new order notification manually');
    const testOrder = {
      id: 'test-' + Date.now(),
      customer_name: 'Test Customer',
      total_amount: 150,
      items: [{ name: 'Test Item', quantity: 2 }],
      delivery_address: 'Test Address 123'
    };
    
    // Start emergency audio
    notificationSound.setVolume(0.8);
    notificationSound.startContinuousRinging('rapido_ringtone');
    
    setNewOrderModal({ visible: true, order: testOrder });
    
    toast({
      title: "🧪 Test: New Order Alert",
      description: "This is a test notification",
      className: "bg-green-600 text-white border-green-600"
    });
  };

  return (
    <>

      {/* Test Button for Development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-16 right-4 z-40">
          <Button
            onClick={testNewOrderNotification}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            size="sm"
          >
            🧪 Test New Order
          </Button>
        </div>
      )}

      {/* Enhanced Modal with debugging */}
      {newOrderModal.visible && newOrderModal.order && (
        <>
          <div className="fixed inset-0 bg-red-500/20 z-50 animate-pulse" />
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