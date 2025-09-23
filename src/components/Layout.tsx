import { useState } from 'react';
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
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto zaago-mobile-container">
            <Outlet />
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