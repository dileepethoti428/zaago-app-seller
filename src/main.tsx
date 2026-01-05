import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { PushNotifications } from '@capacitor/push-notifications'
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

initializePushNotifications();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </ThemeProvider>
);
