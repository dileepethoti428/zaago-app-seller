import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import App from './App.tsx'
import './index.css'
import { queryClient, persister } from './lib/queryClient'

// Create notification channel for Android (runs once on app start)
const initializePushNotifications = async () => {
  try {
    await PushNotifications.createChannel({
      id: 'orders',
      name: 'New Orders',
      description: 'New order alerts for sellers',
      importance: 5, // HIGH importance
      sound: 'default',
      vibration: true,
    });
    console.log('Notification channel created successfully');
  } catch (error) {
    console.log('Capacitor not available or channel already exists:', error);
  }
};

// 🔔 Register local notification actions (Accept / Reject)
const initializeLocalNotificationActions = async () => {
  try {
    await LocalNotifications.requestPermissions();

    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'ORDER_ACTIONS',
          actions: [
            { id: 'ACCEPT_ORDER', title: 'Accept' },
            { id: 'REJECT_ORDER', title: 'Reject' },
          ],
        },
      ],
    });

    console.log('Local notification actions registered');
  } catch (error) {
    console.log('LocalNotifications init skipped:', error);
  }
};

initializePushNotifications();
initializeLocalNotificationActions();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </ThemeProvider>
);
