import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignal: any;
  }
}

export const useOneSignal = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    
    if (!oneSignalAppId) {
      console.warn('OneSignal App ID not configured');
      return;
    }
    
    // Initialize OneSignal
    window.OneSignal = window.OneSignal || [];
    window.OneSignal.push(() => {
      window.OneSignal.init({
        appId: oneSignalAppId,
        notifyButton: {
          enable: true,
        },
        allowLocalhostAsSecureOrigin: true,
      });
      
      // Set external user ID to link with Supabase user
      window.OneSignal.setExternalUserId(user.id);
      console.log('OneSignal external user ID set:', user.id);
      
      // Get and save player ID to database
      window.OneSignal.getUserId((playerId: string) => {
        if (playerId) {
          console.log('OneSignal player ID received:', playerId);
          supabase
            .from('profiles')
            .update({ onesignal_player_id: playerId })
            .eq('user_id', user.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error saving player ID:', error);
              } else {
                console.log('OneSignal player ID saved to database');
              }
            });
        }
      });
      
      // Handle notification display
      window.OneSignal.on('notificationDisplay', (event: any) => {
        console.log('OneSignal notification displayed:', event);
      });
      
      // Handle notification clicks
      window.OneSignal.on('notificationClick', (event: any) => {
        console.log('OneSignal notification clicked:', event);
        const data = event.data;
        
        // Navigate to order detail if it's an order update
        if (data?.type === 'order_update' && data?.orderId) {
          window.location.href = `/#/order/${data.orderId}`;
        }
      });
    });
  }, [user]);
  
  const requestPermission = () => {
    if (window.OneSignal) {
      window.OneSignal.push(() => {
        window.OneSignal.showNativePrompt();
      });
    }
  };
  
  return {
    requestPermission,
  };
};
