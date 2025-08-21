import { motion } from 'framer-motion';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Topbar() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

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

  return (
    <motion.header 
      className="bg-zaago-dark shadow-card border-b border-border p-3 sm:p-4 flex items-center justify-between"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <SidebarTrigger className="md:hidden p-1.5 sm:p-2 rounded-xl sm:rounded-2xl zaago-button-ghost" />
        <h2 className="text-base sm:text-lg font-semibold text-foreground hidden sm:block">
          Zaago Seller Dashboard
        </h2>
        <h2 className="text-sm font-semibold text-foreground sm:hidden">
          Dashboard
        </h2>
      </div>
      
      
      <div className="flex items-center gap-2 sm:gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-1 sm:gap-2 text-secondary">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm hidden sm:inline truncate max-w-24 lg:max-w-none">{user.email}</span>
            </div>
            <div className="text-primary font-semibold text-xs sm:text-sm">
              Seller Dashboard
            </div>
          </>
        ) : (
          <div className="text-primary font-semibold text-xs sm:text-sm">
            Seller Dashboard
          </div>
        )}
      </div>
    </motion.header>
  );
}