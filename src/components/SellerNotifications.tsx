import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';
import { NewOrderNotificationModal } from './NewOrderNotificationModal';

export const SellerNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newOrderModal, setNewOrderModal] = useState<{
    visible: boolean;
    order: any;
  }>({ visible: false, order: null });

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
        async (payload) => {
          const notification = payload.new;
          
          // Handle new order notifications with enhanced urgency
          if (notification.type === 'new_order') {
            console.log('🚨 URGENT: New order notification received! Starting immediate action sequence');
            
            // Immediate audio notification with maximum urgency
            try {
              await notificationSound.ensureAudioContext();
              const audioStatus = notificationSound.getAudioStatus();
              console.log('🔊 Audio status for new order:', audioStatus);
              
              // Start continuous ringing immediately
              notificationSound.startContinuousRinging('rapido_ringtone');
              
              // Request browser notification permission if not granted
              if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
              }
              
              // Show persistent browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                const notif = new Notification('🚨 NEW ORDER RECEIVED!', {
                  body: `Urgent: New customer order needs your immediate attention`,
                  icon: '/zaago-logo.png',
                  badge: '/zaago-logo.png',
                  tag: 'new-order',
                  requireInteraction: true
                });
                
                // Try vibration separately for mobile devices
                if ('vibrate' in navigator) {
                  navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
                }
                
                notif.onclick = () => {
                  window.focus();
                  notif.close();
                };
              }
            } catch (error) {
              console.error('🚨 Error with new order notification:', error);
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

            // Show the modal
            setNewOrderModal({ visible: true, order: orderDetails });
            
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

  return (
    <>
      {newOrderModal.visible && newOrderModal.order && (
        <NewOrderNotificationModal
          order={newOrderModal.order}
          onAccept={handleAcceptOrder}
          onDismiss={handleDismissOrder}
          onViewOrder={handleViewOrder}
        />
      )}
    </>
  );
};