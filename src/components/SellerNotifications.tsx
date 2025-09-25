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
          
          // Handle new order notifications with continuous ringing
          if (notification.type === 'new_order') {
            console.log('New order notification received, starting continuous ringing');
            
            // Start continuous ringing
            notificationSound.startContinuousRinging('new_order_ringtone');
            
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
          
          // Show toast for all notifications
          toast({
            title: notification.title,
            description: notification.message,
            duration: notification.type === 'new_order' ? 30000 : 8000, // Longer duration for new orders
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
    console.log('Order accepted');
    setNewOrderModal({ visible: false, order: null });
    // Here you would typically update the order status
    toast({
      title: "Order Accepted",
      description: "You have accepted the new order",
      className: "bg-green-600 text-white border-green-600"
    });
  };

  const handleDismissOrder = () => {
    console.log('Order dismissed');
    setNewOrderModal({ visible: false, order: null });
  };

  const handleViewOrder = () => {
    console.log('Viewing order details');
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