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
  // NOTE: Ringtone is already playing from handleNotification, this just manages escalation
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

    // Stage 1: Ringtone already playing (from handleNotification)
    console.log('🚨 Stage 1: Monitoring notification (ringtone already active)');
    setEscalationLevel(1);

    // Stage 2: Increase vibration urgency after 10s
    const stage2Timer = setTimeout(() => {
      console.log('🚨 Stage 2: Increased vibration urgency');
      setEscalationLevel(2);
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
    }, 10000);

    // Stage 3: Maximum urgency after 20s (just vibration, audio already playing)
    const stage3Timer = setTimeout(() => {
      console.log('🚨 Stage 3: MAXIMUM URGENCY - Enhanced vibration');
      setEscalationLevel(3);
      
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
    console.log('🔔 ========== HANDLE NOTIFICATION CALLED ==========');
    console.log('📦 Full notification object:', notification);
    console.log('📦 Notification ID:', notification.id);
    console.log('📦 Notification type:', notification.type);
    console.log('📦 Notification role:', notification.role);
    console.log('📦 Order ID:', notification.order_id);
    console.log('📦 Created at:', notification.created_at);
    console.log('📦 Metadata:', notification.metadata);
    
    // Handle new order notifications with MAXIMUM URGENCY
    if (notification.type === 'new_order') {
      console.log('🚨🚨🚨 CRITICAL: NEW ORDER NOTIFICATION DETECTED! 🚨🚨🚨');
      console.log('🚨 Initiating EMERGENCY ALERT SEQUENCE');
      
      // 🔊 CRITICAL FIX: Play ringtone IMMEDIATELY - Don't wait!
      console.log('🔊 PLAYING RINGTONE IMMEDIATELY');
      try {
        await notificationSound.ensureAudioContext();
        notificationSound.setVolume(1.0); // Maximum volume
        notificationSound.startContinuousRinging('rapido_ringtone');
        console.log('✅ Ringtone started successfully');
      } catch (error) {
        console.error('❌ Failed to play ringtone:', error);
      }
      
      // Extract order ID from multiple possible sources
      const orderId = notification.order_id || notification.reference_id || notification.metadata?.order_id;
      console.log('🚨 Order ID extracted:', orderId);
      console.log('🚨 Notification message:', notification.message);
      console.log('🚨 Notification title:', notification.title);
      
      // Extract metadata for immediate display
      const metadata = notification.metadata || {};
      console.log('📦 ========== METADATA ANALYSIS ==========');
      console.log('📦 Has metadata:', !!metadata);
      console.log('📦 Metadata keys:', Object.keys(metadata));
      console.log('📦 seller_total:', metadata.seller_total);
      console.log('📦 seller_items:', metadata.seller_items);
      console.log('📦 seller_items length:', metadata.seller_items?.length);
      console.log('📦 total_items_count:', metadata.total_items_count);
      console.log('📦 item_names:', metadata.item_names);
      console.log('📦 customer_name:', metadata.customer_name);
      console.log('📦 customer_phone:', metadata.customer_phone);
      console.log('📦 delivery_address:', metadata.delivery_address);
      console.log('📦 payment_method:', metadata.payment_method);
      console.log('📦 payment_status:', metadata.payment_status);
      console.log('📦 ========================================');
      
      // IMMEDIATE VISUAL FEEDBACK - Show modal state change
      console.log('🚨 Setting modal visible state to TRUE');
      
      // BROWSER NOTIFICATION with maximum urgency
      const showEmergencyNotification = async () => {
        if ('Notification' in window) {
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
          
          if (Notification.permission === 'granted') {
            // Create enhanced notification with seller-specific details
            const itemInfo = metadata.item_names 
              ? `${metadata.total_items_count} item(s): ${metadata.item_names}` 
              : `Order #${orderId?.slice(-6) || 'Unknown'}`;
            const totalInfo = metadata.seller_total ? ` - ₹${metadata.seller_total}` : '';
            
            const notif = new Notification('🚨🚨 EMERGENCY: NEW ORDER! 🚨🚨', {
              body: `URGENT: ${metadata.customer_name || 'Customer'}\n${itemInfo}${totalInfo}`,
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
      
      // Initialize order details with seller-specific metadata from backend
      let orderDetails = {
        id: orderId || 'unknown',
        customer_name: metadata.customer_name || 'New Customer',
        customer_phone: metadata.customer_phone || '',
        total_amount: metadata.seller_total || metadata.total_amount || 0, // Use seller-specific total
        items: metadata.seller_items || metadata.items || [], // Use seller-specific items
        delivery_address: metadata.delivery_address || metadata.address || '',
        payment_method: metadata.payment_method || 'COD',
        payment_status: metadata.payment_status || 'pending',
        seller_id: metadata.seller_id || '',
        seller_item_names: metadata.item_names || '', // Comma-separated item names
        seller_item_count: metadata.total_items_count || 0 // Count of seller items
      };
      
      console.log('📦 Initial order details with seller-specific metadata:', orderDetails);

      // Try to fetch complete order details from database
      if (orderId && orderId !== 'unknown') {
        try {
          console.log('🔍 Fetching complete order details for ID:', orderId);
          
          // Fetch complete order details with all products
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
              *,
              address
            `)
            .eq('id', orderId)
            .single();

          if (orderError) {
            console.error('❌ Error fetching order:', orderError);
            console.log('📦 Using metadata fallback for order display');
          } else if (order) {
            console.log('✅ Order fetched successfully:', order);
            
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
              .maybeSingle();
            
            console.log('🔍 Seller record:', sellerRecord);
            
            if (sellerError) {
              console.error('❌ Error fetching seller record:', sellerError);
            }
            
            if (!sellerRecord) {
              console.warn('⚠️ No seller record found for user:', authUser?.id);
              console.log('📦 Using all items from order (no seller filtering)');
              
              // Map items to ensure they have all required fields
              const mappedItems = items.map((item: any) => ({
                id: item.id || item.product_id,
                name: item.name || item.product_name || 'Unknown Product',
                quantity: item.quantity || 1,
                price: item.price || item.unit_price || 0,
                total_price: (item.price || item.unit_price || 0) * (item.quantity || 1)
              }));
              
              // Use all items if no seller record found
              orderDetails = {
                ...orderDetails,
                id: order.id,
                customer_name: order.customer_name || orderDetails.customer_name,
                customer_phone: order.customer_phone || orderDetails.customer_phone,
                total_amount: order.total || orderDetails.total_amount,
                items: mappedItems.length > 0 ? mappedItems : orderDetails.items,
                delivery_address: order.address ? 
                  (typeof order.address === 'string' ? order.address : 
                   `${(order.address as any)?.full_address || ''}, ${(order.address as any)?.city || ''}`.trim()) 
                  : orderDetails.delivery_address,
                payment_method: (order as any).payment_method || orderDetails.payment_method,
                payment_status: (order as any).payment_status || orderDetails.payment_status,
                seller_item_names: orderDetails.seller_item_names || '',
                seller_item_count: orderDetails.seller_item_count || 0
              };
            } else {
              // Use seller-specific metadata if available (backend already filtered)
              if (metadata.seller_items && metadata.seller_items.length > 0) {
                console.log('✅ Using backend-filtered seller items from metadata');
                
                // Map metadata items to ensure consistent format
                const sellerItems = metadata.seller_items.map((item: any) => ({
                  id: item.id || item.product_id,
                  name: item.name || item.product_name || 'Unknown Product',
                  quantity: item.quantity || 1,
                  price: item.price || item.unit_price || 0,
                  total_price: (item.price || item.unit_price || 0) * (item.quantity || 1)
                }));
                
                orderDetails = {
                  id: order.id,
                  customer_name: order.customer_name || orderDetails.customer_name,
                  customer_phone: order.customer_phone || orderDetails.customer_phone,
                  total_amount: metadata.seller_total || orderDetails.total_amount,
                  items: sellerItems,
                  delivery_address: order.address ? 
                    (typeof order.address === 'string' ? order.address : 
                     `${(order.address as any)?.full_address || ''}, ${(order.address as any)?.city || ''}`.trim()) 
                    : orderDetails.delivery_address,
                  payment_method: (order as any).payment_method || orderDetails.payment_method,
                  payment_status: (order as any).payment_status || orderDetails.payment_status,
                  seller_id: sellerRecord.user_id,
                  seller_item_names: metadata.item_names,
                  seller_item_count: metadata.total_items_count
                };
              } else {
                // Fallback: Filter items manually if metadata not available
                console.log('⚠️ Metadata seller_items not available, using fallback filtering');
                const sellerUserId = sellerRecord.user_id;
                console.log('🔍 Filtering products for seller:', sellerRecord.name, '(', sellerRecord.email, ')');
                console.log('🔍 Using seller user ID for filtering:', sellerUserId);

                // Filter items to only include products from this seller
                const sellerItems = items
                  .filter((item: any) => {
                    console.log('🔍 Item:', item.name, 'seller_id:', item.seller_id);
                    console.log('🔍 Does', item.seller_id, '===', sellerUserId, '?', item.seller_id === sellerUserId);
                    return item.seller_id === sellerUserId;
                  })
                  .map((item: any) => ({
                    id: item.id || item.product_id,
                    name: item.name || item.product_name || 'Unknown Product',
                    quantity: item.quantity || 1,
                    price: item.price || item.unit_price || 0,
                    total_price: (item.price || item.unit_price || 0) * (item.quantity || 1)
                  }));

                console.log('🔍 Total items in order:', items.length);
                console.log('🔍 Items for current seller:', sellerItems.length);
                console.log('🔍 Seller items with calculated totals:', sellerItems);

                // Calculate seller's portion of the total
                const sellerTotal = sellerItems.reduce((sum: number, item: any) => 
                  sum + (item.total_price || 0), 0
                );

                orderDetails = {
                  id: order.id,
                  customer_name: order.customer_name || orderDetails.customer_name,
                  customer_phone: order.customer_phone || orderDetails.customer_phone,
                  total_amount: sellerTotal || orderDetails.total_amount,
                  items: sellerItems.length > 0 ? sellerItems : orderDetails.items,
                  delivery_address: order.address ? 
                    (typeof order.address === 'string' ? order.address : 
                     `${(order.address as any)?.full_address || ''}, ${(order.address as any)?.city || ''}`.trim()) 
                    : orderDetails.delivery_address,
                  payment_method: (order as any).payment_method || orderDetails.payment_method,
                  payment_status: (order as any).payment_status || orderDetails.payment_status,
                  seller_id: sellerUserId,
                  seller_item_names: sellerItems.map((item: any) => item.name).join(', '),
                  seller_item_count: sellerItems.length
                };
              }
            }

            console.log('📦 Enhanced order details from database:', orderDetails);
          }
        } catch (error) {
          console.error('❌ Exception while fetching order details:', error);
          console.log('📦 Continuing with metadata fallback');
        }
      } else {
        console.warn('⚠️ No valid order ID found, using metadata only');
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

    console.log('🔔 Setting up ENHANCED notification subscription for user:', user.id);
    console.log('📊 Current state:', {
      isPolling,
      connectionStatus,
      reconnectAttempts: reconnectAttempts.current,
      lastChecked,
      notificationDeliveryCount
    });
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
      .channel(`seller-notifications-${user.id}-${Date.now()}`) // Unique channel name with timestamp
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
          console.log('🔔 ========== REAL-TIME NOTIFICATION RECEIVED ==========');
          console.log('📦 Notification data:', {
            id: notification.id,
            type: notification.type,
            role: notification.role,
            title: notification.title,
            order_id: notification.order_id,
            created_at: notification.created_at,
            metadata_keys: notification.metadata ? Object.keys(notification.metadata) : [],
            full_metadata: notification.metadata
          });
          
          // Update delivery metrics
          setNotificationDeliveryCount(prev => prev + 1);
          setLastNotificationTime(new Date());
          
          // Filter for new_order only at the application level
          if (notification.type === 'new_order') {
            console.log('🚨🚨🚨 NEW ORDER notification detected via REAL-TIME! 🚨🚨🚨');
            console.log('📊 Metadata check:', {
              has_metadata: !!notification.metadata,
              seller_total: notification.metadata?.seller_total,
              seller_items_count: notification.metadata?.seller_items?.length,
              item_names: notification.metadata?.item_names,
              customer_phone: notification.metadata?.customer_phone,
              delivery_address: notification.metadata?.delivery_address,
              payment_method: notification.metadata?.payment_method
            });
            
            // Update last check time to prevent duplicate polling
            setLastChecked(new Date(notification.created_at));
            
            await handleNotification(notification);
            
            console.log('✅✅✅ Real-time NEW ORDER notification handled successfully! ✅✅✅');
          } else {
            console.log('🔇 Ignoring non-new-order notification type:', notification.type);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 ========== SUBSCRIPTION STATUS CHANGED ==========');
        console.log('📡 New status:', status);
        console.log('📊 Channel state:', {
          status,
          user_id: user.id,
          reconnect_attempts: reconnectAttempts.current,
          is_polling: isPolling,
          timestamp: new Date().toISOString()
        });
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          reconnectAttempts.current = 0;
          setLastChecked(new Date());
          console.log('✅✅✅ Successfully SUBSCRIBED to real-time notifications! ✅✅✅');
          console.log('🔊 Audio and notification systems ready');
          
          // Start heartbeat to maintain connection ACTIVELY
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(() => {
            console.log('💓 Sending heartbeat to keep connection alive...');
            sendHeartbeat();
          }, 20000); // Every 20 seconds for more active connection
          
          // Keep aggressive polling even when real-time is working (belt and suspenders)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          pollingIntervalRef.current = setInterval(() => {
            console.log('🔄 Backup polling check (real-time is active)...');
            checkForNewNotifications();
          }, 15000); // Every 15 seconds as aggressive backup
          setIsPolling(true);
          
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionStatus('disconnected');
          setHeartbeatActive(false);
          console.error('❌❌❌ REAL-TIME CONNECTION FAILED! ❌❌❌');
          console.error('🔴 Status:', status);
          console.error('🔴 Falling back to AGGRESSIVE polling mode');
          
          // Stop heartbeat
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          
          // Start VERY aggressive polling as backup
          if (!isPolling || !pollingIntervalRef.current) {
            setIsPolling(true);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            pollingIntervalRef.current = setInterval(() => {
              console.log('🔄🔄🔄 AGGRESSIVE FALLBACK POLLING (real-time failed)');
              checkForNewNotifications();
            }, 3000); // Every 3 seconds when real-time fails
            console.log('🔄 Started AGGRESSIVE backup polling (3s interval)');
          }
          
          // Attempt reconnection with exponential backoff
          const backoffTime = Math.min(reconnectAttempts.current * 2000, 10000);
          console.log(`⏳ Scheduling reconnection attempt in ${backoffTime}ms...`);
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect real-time subscription...');
            attemptReconnection();
          }, backoffTime);
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
    
    // Navigate to order details using hash navigation
    window.location.hash = `/orders/${newOrderModal.order.id}`;
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