import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [newOrderModal, setNewOrderModal] = useState<{
    visible: boolean;
    order: any;
  }>({ visible: false, order: null });
  const [escalationLevel, setEscalationLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [notificationDeliveryCount, setNotificationDeliveryCount] = useState(0);
  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const channelRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const escalationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Progressive escalation effect - Rapido style
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

    // Stage 1: Initial notification (0-10s)
    console.log('🚨 Stage 1: Initial notification');
    setEscalationLevel(1);
    notificationSound.playNotificationSound('urgent');

    // Stage 2: Increase urgency after 10s
    const stage2Timer = setTimeout(() => {
      console.log('🚨 Stage 2: Increased urgency');
      setEscalationLevel(2);
      notificationSound.setVolume(0.9);
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
    }, 10000);

    // Stage 3: Maximum urgency after 20s
    const stage3Timer = setTimeout(() => {
      console.log('🚨 Stage 3: MAXIMUM URGENCY - Continuous ringing');
      setEscalationLevel(3);
      notificationSound.setVolume(1.0);
      notificationSound.startContinuousRinging('rapido_ringtone');
      
      if ('vibrate' in navigator) {
        // Continuous vibration pattern
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

  // Enhanced session initialization - check for missed notifications on first load
  const initializeSession = useCallback(async () => {
    if (!user || sessionInitialized) return;
    
    console.log('🚀 Initializing comprehensive notification system for user:', user.id);
    
    // Check for missed notifications from the last 24 hours for new sessions
    const checkSinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log('🔍 Checking for missed notifications since:', checkSinceTime.toISOString());
    
    try {
      const { data: missedNotifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'new_order')
        .gt('created_at', checkSinceTime.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to check for missed notifications:', error);
      } else if (missedNotifications && missedNotifications.length > 0) {
        console.log('📬 Found', missedNotifications.length, 'missed notifications');
        
        // Store notification state in localStorage for persistence
        localStorage.setItem('zaago_missed_notifications', JSON.stringify({
          count: missedNotifications.length,
          lastCheck: new Date().toISOString(),
          notifications: missedNotifications.slice(0, 3) // Store latest 3
        }));

        // Show urgent toast for missed notifications
        toast({
          title: `🚨 ${missedNotifications.length} MISSED ORDER(S)!`,
          description: `You have ${missedNotifications.length} new order notification(s) that need attention!`,
          duration: 30000,
          className: "bg-red-600 text-white border-red-600 text-lg font-bold animate-pulse"
        });

        // Process the most recent missed notification immediately
        await handleNotification(missedNotifications[0]);
      }
    } catch (error) {
      console.error('❌ Session initialization failed:', error);
    }
    
    setSessionInitialized(true);
    setLastChecked(new Date());
  }, [user, sessionInitialized, toast]);

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

      // SHOW MODAL with enhanced logging and persistence
      console.log('🚨 SHOWING NEW ORDER MODAL with order details:', orderDetails);
      
      // Force state update with callback to ensure it's processed
      setNewOrderModal(prev => {
        console.log('🚨 Modal state transition:', prev, '→', { visible: true, order: orderDetails });
        return { visible: true, order: orderDetails };
      });
      
      // Store in localStorage for recovery
      localStorage.setItem('zaago_active_modal', JSON.stringify({
        visible: true,
        order: orderDetails,
        timestamp: Date.now()
      }));
      
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

  // Enhanced polling function with aggressive checks for critical notifications
  const checkForNewNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔍 Enhanced polling for NEW ORDER notifications since:', lastChecked);
      console.log('🔍 Using user ID for query:', user.id);
      
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

      console.log('🔍 Polling query result:', { 
        found: notifications?.length || 0, 
        notifications: notifications?.map(n => ({ id: n.id, type: n.type, created_at: n.created_at }))
      });

      if (notifications && notifications.length > 0) {
        console.log('📬 Found NEW ORDER notifications via polling:', notifications.length);
        setNotificationDeliveryCount(prev => prev + notifications.length);
        setLastNotificationTime(new Date());
        
        // Update localStorage for persistence
        const existing = JSON.parse(localStorage.getItem('zaago_notifications_processed') || '[]');
        const newIds = notifications.map(n => n.id);
        localStorage.setItem('zaago_notifications_processed', JSON.stringify([...existing, ...newIds]));
        
        for (const notification of notifications) {
          console.log('🚨 Processing NEW ORDER from polling:', notification.type, notification.id);
          await handleNotification(notification);
        }
        setLastChecked(new Date());
      } else {
        console.log('✅ Polling check complete - no new notifications');
      }
    } catch (error) {
      console.error('❌ Polling failed:', error);
    }
  }, [user, lastChecked, handleNotification]);

  // Heartbeat function to ensure connection stays alive
  const sendHeartbeat = useCallback(async () => {
    if (!user || !channelRef.current) return;
    
    try {
      // Simple query to keep connection alive
      await supabase
        .from('notifications')
        .select('count')
        .eq('user_id', user.id)
        .limit(1);
      
      console.log('💓 Heartbeat sent successfully');
      setHeartbeatActive(true);
      
      // Reset connection status to connected if it was disconnected
      if (connectionStatus === 'disconnected') {
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('💔 Heartbeat failed:', error);
      setHeartbeatActive(false);
      setConnectionStatus('disconnected');
    }
  }, [user, connectionStatus]);

  // Enhanced reconnection strategy with better fallback handling
  const attemptReconnection = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('🚨 Maximum reconnection attempts reached. Falling back to aggressive polling.');
      
      // Show user feedback about connection issues
      toast({
        title: "⚠️ Connection Issues",
        description: "Using backup system to ensure you don't miss orders",
        duration: 5000,
        className: "bg-orange-600 text-white"
      });
      
      // Start very aggressive polling as last resort
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = setInterval(checkForNewNotifications, 3000); // Every 3 seconds
      setIsPolling(true);
      setConnectionStatus('disconnected');
      
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 15000);
    reconnectAttempts.current++;
    
    console.log(`🔄 Scheduling reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`🔄 Executing reconnection attempt ${reconnectAttempts.current}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = setupSubscription();
    }, delay);
  }, [checkForNewNotifications, toast]);

  // Enhanced real-time subscription with comprehensive monitoring
  const setupSubscription = useCallback(() => {
    if (!user) return null;

    console.log('🔔 Setting up enhanced notification subscription for user:', user.id);
    setConnectionStatus('connecting');

    // Initialize audio context early and request permissions
    const initAudio = async () => {
      try {
        await notificationSound.ensureAudioContext();
        console.log('🔊 Audio context pre-initialized for notifications');
        
        // Request notification permission proactively
        if ('Notification' in window && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          console.log('🔔 Notification permission:', permission);
        }
      } catch (error) {
        console.warn('🔊 Could not pre-initialize audio:', error);
      }
    };
    initAudio();

    // Subscribe to notifications for this seller - ONLY NEW ORDERS
    const notificationsChannel = supabase
      .channel(`seller-notifications-${user.id}-${Date.now()}`) // Unique channel name
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
          
          // Update delivery metrics
          setNotificationDeliveryCount(prev => prev + 1);
          setLastNotificationTime(new Date());
          
          // Filter for new_order only at the application level
          if (notification.type === 'new_order') {
            console.log('🚨 NEW ORDER notification received via real-time:', notification);
            await handleNotification(notification);
            
            // Show success toast for real-time delivery
            console.log('✅ Real-time notification delivered successfully');
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
          setLastChecked(new Date());
          console.log('🔔 Successfully connected to notifications');
          
          // Start heartbeat to maintain connection
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000); // Every 30 seconds
          
          // Reduce polling frequency when real-time is working, but keep it active
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          pollingIntervalRef.current = setInterval(checkForNewNotifications, 30000); // Every 30 seconds as backup
          setIsPolling(true);
          
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionStatus('disconnected');
          setHeartbeatActive(false);
          console.error('🔔 Channel error/timeout/closed - initiating recovery');
          
          // Stop heartbeat
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          
          // Start aggressive polling as backup
          if (!isPolling) {
            setIsPolling(true);
            pollingIntervalRef.current = setInterval(checkForNewNotifications, 5000); // Every 5 seconds
            console.log('🔄 Started aggressive backup polling');
          }
          
          // Attempt reconnection
          attemptReconnection();
        }
      });

    return notificationsChannel;
  }, [user, handleNotification, checkForNewNotifications, isPolling, sendHeartbeat, attemptReconnection, toast]);

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

    console.log('🚀 Initializing comprehensive notification system for user:', user.id);
    
    // Setup subscription immediately
    channelRef.current = setupSubscription();

    // Start immediate polling as backup (more aggressive)
    const pollingDelayTimeout = setTimeout(() => {
      if (!isPolling) {
        console.log('🔄 Starting backup polling system');
        setIsPolling(true);
        pollingIntervalRef.current = setInterval(checkForNewNotifications, 10000); // Every 10 seconds
      }
    }, 5000); // Start after 5 seconds instead of 30

    // Initial check for any missed notifications
    const initialCheck = setTimeout(() => {
      console.log('🔍 Performing initial notification check');
      checkForNewNotifications();
    }, 1000);

    return () => {
      console.log('🔔 Comprehensive cleanup of notification system');
      
      // Clean up subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Clean up polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Clean up heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Clean up reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      clearTimeout(pollingDelayTimeout);
      clearTimeout(initialCheck);
      setIsPolling(false);
      setHeartbeatActive(false);
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
    localStorage.removeItem('zaago_active_modal');
    
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
    
    // Stop continuous ringing and all escalation
    notificationSound.stopContinuousRinging();
    setEscalationLevel(0);
    if (escalationTimerRef.current) {
      clearInterval(escalationTimerRef.current);
      escalationTimerRef.current = null;
    }
    
    setNewOrderModal({ visible: false, order: null });
    localStorage.removeItem('zaago_active_modal');
  };

  const handleViewOrder = () => {
    console.log('👀 Viewing order details - stopping notifications');
    
    if (!newOrderModal.order?.id) {
      toast({
        title: "Error",
        description: "Order ID not found",
        variant: "destructive"
      });
      return;
    }
    
    // Stop continuous ringing and escalation
    notificationSound.stopContinuousRinging();
    setEscalationLevel(0);
    if (escalationTimerRef.current) {
      clearInterval(escalationTimerRef.current);
      escalationTimerRef.current = null;
    }
    
    // Close modal first
    setNewOrderModal({ visible: false, order: null });
    localStorage.removeItem('zaago_active_modal');
    
    // Navigate using React Router
    navigate(`/orders/${newOrderModal.order.id}`);
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