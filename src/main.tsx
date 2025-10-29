import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import App from './App.tsx'
import './index.css'
import { queryClient, persister } from './lib/queryClient'

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </ThemeProvider>
);
