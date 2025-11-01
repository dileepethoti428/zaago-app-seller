import { useState, useCallback, useRef, useEffect } from 'react';

interface DelayedNotification {
  id: string;
  orderId: string;
  notification: any;
  timerId: NodeJS.Timeout;
  startTime: number;
}

export const useDelayedNotification = () => {
  const [pendingNotifications, setPendingNotifications] = useState<Map<string, DelayedNotification>>(new Map());
  const pendingRef = useRef<Map<string, DelayedNotification>>(new Map());

  useEffect(() => {
    pendingRef.current = pendingNotifications;
  }, [pendingNotifications]);

  const scheduleNotification = useCallback((
    notification: any,
    onShow: (notification: any) => void,
    delayMs: number = 10000
  ) => {
    const orderId = notification.order_id || notification.metadata?.order_id;
    if (!orderId) return null;

    // Check if already scheduled
    if (pendingRef.current.has(orderId)) {
      console.log('⏰ Notification already scheduled for order:', orderId);
      return null;
    }

    console.log(`⏰ Scheduling notification for order ${orderId} in ${delayMs}ms`);

    const timerId = setTimeout(() => {
      console.log('🔔 Delayed notification triggered for order:', orderId);
      onShow(notification);
      
      // Remove from pending after showing
      setPendingNotifications(prev => {
        const updated = new Map(prev);
        updated.delete(orderId);
        return updated;
      });
    }, delayMs);

    const delayedNotif: DelayedNotification = {
      id: notification.id,
      orderId,
      notification,
      timerId,
      startTime: Date.now()
    };

    setPendingNotifications(prev => {
      const updated = new Map(prev);
      updated.set(orderId, delayedNotif);
      return updated;
    });

    return orderId;
  }, []);

  const cancelNotification = useCallback((orderId: string) => {
    const pending = pendingRef.current.get(orderId);
    
    if (pending) {
      console.log('❌ Cancelling delayed notification for order:', orderId);
      clearTimeout(pending.timerId);
      
      setPendingNotifications(prev => {
        const updated = new Map(prev);
        updated.delete(orderId);
        return updated;
      });
      
      return true;
    }
    
    return false;
  }, []);

  const cancelAllNotifications = useCallback(() => {
    console.log('❌ Cancelling all delayed notifications');
    
    pendingRef.current.forEach((pending) => {
      clearTimeout(pending.timerId);
    });
    
    setPendingNotifications(new Map());
  }, []);

  const isPending = useCallback((orderId: string) => {
    return pendingRef.current.has(orderId);
  }, []);

  const getPendingCount = useCallback(() => {
    return pendingRef.current.size;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((pending) => {
        clearTimeout(pending.timerId);
      });
    };
  }, []);

  return {
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    isPending,
    getPendingCount,
    pendingNotifications
  };
};
