'use client';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  ShoppingCart,
  Package, 
  PlusCircle, 
  Truck, 
  CreditCard,
  Bell,
  Settings,
  LogOut, 
  Menu, 
  User,
  Users,
  Tag
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
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
  { href: '/customer-orders', label: 'Orders', icon: ShoppingCart },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/products/new', label: 'Add Product', icon: PlusCircle },
  { href: '/special-offers', label: 'Special Offers', icon: Tag },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
];

const customerLinks = [
  { href: '/products-customer', label: 'Browse Products', icon: Package },
  { href: '/cart', label: 'Shopping Cart', icon: ShoppingCart },
  { href: '/customer-orders', label: 'My Orders', icon: Truck },
];

export default function Sidebar() {
  const { state, setOpen } = useSidebar();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const handleNavClick = () => {
    // Keep sidebar open when navigation items are clicked
  };

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
    const base = "flex items-center gap-3 p-3 rounded-2xl w-full";
    return isActive(path) 
      ? `${base} zaago-nav-active`
      : `${base} zaago-nav-inactive transition-colors duration-200`;
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
              <div 
                className="text-zaago-green font-bold text-lg sm:text-xl lg:text-2xl hover:text-zaago-green-light transition-colors cursor-pointer block leading-tight"
              >
                Seller
              </div>
            </motion.div>
          )}
          {collapsed && (
            <motion.div 
              className="text-primary font-bold text-lg sm:text-xl text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div 
                className="text-zaago-green hover:text-zaago-green-light transition-colors cursor-pointer block"
              >
                S
              </div>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel className={collapsed ? "sr-only" : "text-white text-sm px-4 py-2"}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2 sm:px-4">
              {navigationLinks.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <NavLink
                    to={href}
                    className={getNavClassName(href)}
                    onClick={handleNavClick}
                  >
                    <SidebarMenuButton className="w-full h-full p-0">
                      <div className="flex items-center gap-3 w-full p-3">
                        <Icon size={18} className="shrink-0 sm:w-5 sm:h-5" />
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="font-medium text-sm sm:text-base text-white"
                          >
                            {label}
                          </motion.span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout and Toggle */}
        <div className="p-2 sm:p-4 border-t border-border space-y-1 sm:space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl zaago-button-ghost hover:bg-red-500/10 hover:text-red-400 active:bg-red-500/20 active:text-red-400/90 transition-colors"
          >
            <LogOut size={18} className="shrink-0 sm:w-5 sm:h-5" />
            {!collapsed && (
              <span className="font-medium text-sm sm:text-base text-white">Sign Out</span>
            )}
          </button>
          <SidebarTrigger className="w-full flex items-center justify-center p-2 rounded-xl sm:rounded-2xl zaago-button-ghost active:bg-zaago-accent/70">
            <Menu size={18} className="sm:w-5 sm:h-5" />
          </SidebarTrigger>
        </div>
      </SidebarContent>
    </SidebarUI>
  );
}