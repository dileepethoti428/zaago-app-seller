import { supabase } from '@/integrations/supabase/client';

/**
 * Register a seller for push notifications
 * This saves the OneSignal player ID to the user's profile
 */
export const registerSellerForPush = async (userId: string): Promise<void> => {
  try {
    // Check if OneSignal is available
    if (typeof window === 'undefined' || !window.OneSignal) {
      console.log('OneSignal not available');
      return;
    }

    // Get the OneSignal player ID
    window.OneSignal.push(async () => {
      try {
        const playerId = await window.OneSignal.getUserId();
        
        if (playerId) {
          console.log('Registering seller for push with player ID:', playerId);
          
          // Save to profiles table
          const { error } = await supabase
            .from('profiles')
            .update({ onesignal_player_id: playerId })
            .eq('user_id', userId);

          if (error) {
            console.error('Error saving player ID:', error);
          } else {
            console.log('Successfully registered seller for push notifications');
          }
        }
      } catch (error) {
        console.error('Error getting OneSignal player ID:', error);
      }
    });
  } catch (error) {
    console.error('Error registering for push:', error);
  }
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Show a browser notification
 */
export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions
): Notification | null => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  return new Notification(title, {
    icon: '/zaago-logo.png',
    ...options,
  });
};
