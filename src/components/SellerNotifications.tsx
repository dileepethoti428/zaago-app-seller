import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationSound } from '@/utils/notificationSound';
import { NewOrderNotificationModal } from './NewOrderNotificationModal';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export const SellerNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newOrderModal, setNewOrderModal] = useState<{
    visible: boolean;
    order: any;
  }>({ visible: false, order: null });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const channelRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // Handle notification processing (extracted for reuse)
  const handleNotification = useCallback(async (notification: any) => {
    console.log('🔔 Processing notification:', notification);
    
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
        customer_phone: '',
        total_amount: 0,
        items: [],
        delivery_address: '',
        payment_method: 'COD',
        payment_status: 'pending',
        seller_id: ''
      };

      if (notification.reference_id) {
        try {
          // Fetch complete order details with all products
          const { data: order } = await supabase
            .from('orders')
            .select(`
              *,
              address
            `)
            .eq('id', notification.reference_id)
            .single();

          if (order) {
            // Parse the items JSON to get detailed product information
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
            
            // Get current user (seller) ID to filter products
            const { data: { user: authUser } } = await supabase.auth.getUser();
            console.log('🔍 Auth user ID:', authUser?.id);
            
            // Get the seller record for the authenticated user
            const { data: sellerRecord, error: sellerError } = await supabase
              .from('sellers')
              .select('id, user_id, name, email')
              .eq('user_id', authUser?.id)
              .single();
            
            console.log('🔍 Seller record:', sellerRecord);
            console.log('🔍 Seller error:', sellerError);
            
            if (!sellerRecord) {
              console.log('❌ No seller record found for user:', authUser?.id);
              console.log('📋 This might be the issue - user is not registered as a seller');
              return;
            }
            
            // Use the seller's user_id for filtering
            const sellerUserId = sellerRecord.user_id;
            console.log('🔍 Filtering products for seller:', sellerRecord.name, '(', sellerRecord.email, ')');
            console.log('🔍 Using seller user ID for filtering:', sellerUserId);

            // Filter items to only include products from this seller
            const sellerItems = items.filter((item: any) => {
              console.log('🔍 Item:', item.name, 'seller_id:', item.seller_id);
              console.log('🔍 Does', item.seller_id, '===', sellerUserId, '?', item.seller_id === sellerUserId);
              return item.seller_id === sellerUserId;
            });

            console.log('🔍 Total items in order:', items.length);
            console.log('🔍 Items for current seller:', sellerItems.length);
            console.log('🔍 Seller items:', sellerItems);

            orderDetails = {
              id: order.id,
              customer_name: order.customer_name || 'Customer',
              customer_phone: order.customer_phone || '',
              total_amount: order.total || 0,
              items: sellerItems, // Only seller's products
              delivery_address: order.address ? 
                (typeof order.address === 'string' ? order.address : 
                 `${(order.address as any)?.full_address || ''}, ${(order.address as any)?.city || ''}`.trim()) 
                : 'Address not available',
              payment_method: (order as any).payment_method || 'COD',
              payment_status: (order as any).payment_status || 'pending',
              seller_id: sellerUserId
            };

            console.log('📦 Final order details for modal:', orderDetails);
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
      // This should never happen now since we filter for new_order only
      console.warn('⚠️ Received non-new-order notification (this should not happen):', notification.type);
      return; // Exit early, don't show toast for unexpected notifications
    }
    
    // Show toast only for new orders (since we filter for them)
    toast({
      title: '🚨 URGENT: NEW ORDER!',
      description: `${notification.message} - Action required immediately!`,
      duration: 60000, // Extra long duration for new orders
      className: getToastStyles('new_order')
    });
  }, [toast]);

  // Fallback polling function to check for new notifications
  const checkForNewNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔍 Polling for NEW ORDER notifications since:', lastChecked);
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'new_order')
        .gt('created_at', lastChecked.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Polling error:', error);
        return;
      }

      if (notifications && notifications.length > 0) {
        console.log('📬 Found NEW ORDER notifications via polling:', notifications.length);
        for (const notification of notifications) {
          console.log('🚨 Processing NEW ORDER from polling:', notification.type);
          await handleNotification(notification);
        }
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('❌ Polling failed:', error);
    }
  }, [user, lastChecked, handleNotification]);

  // Setup real-time subscription with auto-reconnection
  const setupSubscription = useCallback(() => {
    if (!user) return null;

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

      // Subscribe to notifications for this seller - ONLY NEW ORDERS
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
          console.log('🔔 Real-time notification received:', notification);
          
          // Filter for new_order only at the application level
          if (notification.type === 'new_order') {
            console.log('🚨 NEW ORDER notification received via real-time:', notification);
            await handleNotification(notification);
          } else {
            console.log('🔇 Ignoring non-new-order notification:', notification.type);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Subscription status changed:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          reconnectAttempts.current = 0;
          setLastChecked(new Date()); // Update last checked time on successful connection
          console.log('🔔 Successfully connected to notifications');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          console.error('🔔 Channel error/timeout - scheduling reconnection');
          
          // Start polling as backup
          if (!isPolling) {
            setIsPolling(true);
            pollingIntervalRef.current = setInterval(checkForNewNotifications, 15000);
          }
          
          // Schedule reconnection with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Attempting reconnection (attempt ${reconnectAttempts.current})`);
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
            }
            channelRef.current = setupSubscription();
          }, delay);
        }
      });

    return notificationsChannel;
  }, [user, handleNotification, checkForNewNotifications, isPolling]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    setManualRefreshing(true);
    console.log('🔄 Manual refresh triggered');
    
    try {
      await checkForNewNotifications();
      toast({
        title: "🔄 Refreshed",
        description: "Checked for new notifications",
        duration: 2000
      });
    } catch (error) {
      console.error('Manual refresh failed:', error);
      toast({
        title: "❌ Refresh Failed",
        description: "Could not check for notifications",
        duration: 3000,
        className: "bg-red-600 text-white border-red-600"
      });
    } finally {
      setManualRefreshing(false);
    }
  }, [checkForNewNotifications, toast]);

  useEffect(() => {
    if (!user) return;

    // Setup subscription
    channelRef.current = setupSubscription();

    // Start polling as fallback after 30 seconds
    const pollingDelayTimeout = setTimeout(() => {
      if (!isPolling) {
        console.log('🔄 Starting fallback polling');
        setIsPolling(true);
        pollingIntervalRef.current = setInterval(checkForNewNotifications, 15000);
      }
    }, 30000);

    return () => {
      console.log('🔔 Cleaning up notification subscription');
      
      // Clean up subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      // Clean up polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Clean up reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      clearTimeout(pollingDelayTimeout);
      setIsPolling(false);
    };
  }, [user, setupSubscription, checkForNewNotifications]);

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

  // Debug function to check seller and order data
  const debugSellerData = async () => {
    console.log('🔍 === DEBUGGING SELLER DATA ===');
    
    // Check current auth user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔍 Current auth user:', user?.id, user?.email);
    
    // Check seller record
    const { data: sellerRecord } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    console.log('🔍 Seller record:', sellerRecord);
    
    // Check recent orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    console.log('🔍 Recent orders:', recentOrders);
    
    // Check products owned by this seller
    const { data: products } = await supabase
      .from('products')
      .select('id, name, seller_id')
      .eq('seller_id', user?.id);
    console.log('🔍 Products owned by this seller:', products);
    
    console.log('🔍 === END DEBUG ===');
  };

  return (
    <>
      {/* Test Buttons for Development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-12 right-4 z-40 flex flex-col gap-2">
          <Button
            onClick={testNewOrderNotification}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            size="sm"
          >
            🧪 Test New Order
          </Button>
          <Button
            onClick={debugSellerData}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            size="sm"
          >
            🔍 Debug Seller Data
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