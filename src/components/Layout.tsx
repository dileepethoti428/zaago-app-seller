import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { SidebarProvider } from '@/components/ui/sidebar';

import { SellerNotifications } from './SellerNotifications';
import { AgentNotifications } from './AgentNotifications';
import { CustomerNotifications } from './CustomerNotifications';

const Layout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-hidden h-0">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div className="p-3 sm:p-4 md:p-6 zaago-mobile-container">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
      <SellerNotifications />
      <AgentNotifications />
      <CustomerNotifications />
    </SidebarProvider>
  );
};

export default Layout;
