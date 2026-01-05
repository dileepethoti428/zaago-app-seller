import { useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SellerNotifications } from './SellerNotifications';
import { AgentNotifications } from './AgentNotifications';
import { CustomerNotifications } from './CustomerNotifications';
import { PullToRefresh } from './PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

const Layout = () => {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    // Invalidate all queries to trigger re-fetch across all pages
    await queryClient.invalidateQueries();
    console.log('🔄 Pull-to-refresh: All queries invalidated');
  }, [queryClient]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <PullToRefresh onRefresh={handleRefresh}>
            <main className="flex-1 p-3 sm:p-4 md:p-6 zaago-mobile-container">
              <Outlet />
            </main>
          </PullToRefresh>
        </div>
      </div>
      <SellerNotifications />
      <AgentNotifications />
      <CustomerNotifications />
    </SidebarProvider>
  );
};

export default Layout;