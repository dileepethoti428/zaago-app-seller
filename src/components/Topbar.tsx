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
      className="bg-zaago-dark shadow-card border-b border-border p-4 flex items-center justify-between"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden p-2 rounded-2xl zaago-button-ghost" />
        <h2 className="text-lg font-semibold text-foreground">
          Zaago Seller Dashboard
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-2 text-secondary">
              <User className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 zaago-button-ghost px-3 py-2 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Logout</span>
            </button>
          </>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-secondary text-sm">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>Online</span>
          </div>
        )}
      </div>
    </motion.header>
  );
}