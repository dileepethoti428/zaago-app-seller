'use client';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  ShoppingCart,
  Package, 
  PlusCircle, 
  Truck, 
  Bell,
  Settings,
  LogOut, 
  Menu, 
  User 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/products/new', label: 'Add Product', icon: PlusCircle },
  { href: '/deliveries', label: 'Deliveries', icon: Truck },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => {
    if (path === '/products' && currentPath.startsWith('/products')) {
      return currentPath === '/products';
    }
    return currentPath === path;
  };

  const getNavClassName = (path: string) => {
    const base = "flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 w-full";
    return isActive(path) 
      ? `${base} zaago-nav-active`
      : `${base} zaago-nav-inactive`;
  };

  return (
    <SidebarUI className={`${collapsed ? 'w-12 sm:w-14' : 'w-60 sm:w-64'} bg-zaago-dark border-r border-border`}>
      <SidebarContent className="bg-zaago-dark">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <NavLink 
                to="/"
                className="text-primary font-bold text-lg sm:text-xl lg:text-2xl hover:text-primary-glow transition-colors cursor-pointer block leading-tight"
              >
                Zaago Seller Dashboard
              </NavLink>
            </motion.div>
          )}
          {collapsed && (
            <motion.div 
              className="text-primary font-bold text-lg sm:text-xl text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <NavLink 
                to="/"
                className="text-primary hover:text-primary-glow transition-colors cursor-pointer block"
              >
                Z
              </NavLink>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-secondary text-sm px-4 py-2"}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 sm:space-y-2 px-2 sm:px-4">
              {navigationLinks.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={href}
                      className={getNavClassName(href)}
                    >
                      <Icon size={18} className="shrink-0 sm:w-5 sm:h-5" />
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="font-medium text-sm sm:text-base"
                        >
                          {label}
                        </motion.span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout and Toggle */}
        <div className="p-2 sm:p-4 border-t border-border space-y-1 sm:space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl zaago-button-ghost hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} className="shrink-0 sm:w-5 sm:h-5" />
            {!collapsed && (
              <span className="font-medium text-sm sm:text-base">Sign Out</span>
            )}
          </button>
          <SidebarTrigger className="w-full flex items-center justify-center p-2 rounded-xl sm:rounded-2xl zaago-button-ghost">
            <Menu size={18} className="sm:w-5 sm:h-5" />
          </SidebarTrigger>
        </div>
      </SidebarContent>
    </SidebarUI>
  );
}