import { useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useOneSignalInit = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const initOneSignal = async () => {
      try {
        const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
        
        if (!appId) {
          console.log('⚠️ OneSignal App ID not configured');
          return;
        }

        // Initialize OneSignal
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
        });

        console.log('✅ OneSignal initialized');

        // Check if user is already subscribed
        const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
        
        if (!isSubscribed && user) {
          // Request notification permission
          const permission = await OneSignal.Notifications.requestPermission();
          
          if (permission) {
            console.log('✅ Notification permission granted');
            
            // Get player ID and save to database
            const playerId = await OneSignal.User.PushSubscription.id;
            
            if (playerId && user.id) {
              // Check if user is a seller
              const { data: sellerData } = await supabase
                .from('sellers')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

              if (sellerData) {
                // Update seller's OneSignal player ID
                await supabase
                  .from('sellers')
                  .update({ onesignal_player_id: playerId })
                  .eq('user_id', user.id);

                console.log('✅ OneSignal player ID saved for seller');
                
                toast({
                  title: "Notifications Enabled",
                  description: "You'll receive alerts even when the app is closed",
                });
              }
            }
          }
        }

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async (subscription) => {
          console.log('Push subscription changed:', subscription);
          
          if (subscription.current.id && user?.id) {
            const { data: sellerData } = await supabase
              .from('sellers')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (sellerData) {
              await supabase
                .from('sellers')
                .update({ onesignal_player_id: subscription.current.id })
                .eq('user_id', user.id);
            }
          }
        });

        // Handle notification clicks
        OneSignal.Notifications.addEventListener('click', (event) => {
          console.log('Notification clicked:', event);
          const data = event.notification.additionalData as { order_id?: string };
          
          if (data?.order_id) {
            // Navigate to order details
            window.location.hash = `#/order/${data.order_id}`;
          }
        });

      } catch (error) {
        console.error('❌ OneSignal initialization error:', error);
      }
    };

    if (user) {
      initOneSignal();
    }
  }, [user, toast]);
};
