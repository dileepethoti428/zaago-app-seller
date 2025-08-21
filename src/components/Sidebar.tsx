'use client';
import { NavLink, useLocation } from 'react-router-dom';
import { Package, PlusCircle, Truck, LogOut, Menu, User } from 'lucide-react';
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
  { href: '/products', label: 'Products', icon: Package },
  { href: '/products/new', label: 'Add Product', icon: PlusCircle },
  { href: '/deliveries', label: 'Deliveries', icon: Truck },
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
    <SidebarUI className={`${collapsed ? 'w-14' : 'w-64'} bg-zaago-dark border-r border-border`}>
      <SidebarContent className="bg-zaago-dark">
        {/* Header */}
        <div className="p-4 border-b border-border">
          {!collapsed && (
            <motion.h1 
              className="text-primary font-bold text-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              Zaago Seller Dashboard
            </motion.h1>
          )}
          {collapsed && (
            <motion.div 
              className="text-primary font-bold text-xl text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              Z
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-secondary text-sm px-4 py-2"}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 px-4">
              {navigationLinks.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={href}
                      className={getNavClassName(href)}
                    >
                      <Icon size={20} className="shrink-0" />
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="font-medium"
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
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-2xl zaago-button-ghost hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && (
              <span className="font-medium">Sign Out</span>
            )}
          </button>
          <SidebarTrigger className="w-full flex items-center justify-center p-2 rounded-2xl zaago-button-ghost">
            <Menu size={20} />
          </SidebarTrigger>
        </div>
      </SidebarContent>
    </SidebarUI>
  );
}