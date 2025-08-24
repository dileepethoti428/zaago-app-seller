import { motion } from 'framer-motion';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, MapPin, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useLocation } from '@/hooks/useLocation';
import { LocationSelector } from './LocationSelector';
import { useState } from 'react';

export default function Topbar() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { location, loading: locationLoading, getCurrentLocation } = useLocation();
  const [showLocationSelector, setShowLocationSelector] = useState(false);

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
        <div className="flex flex-col">
          <h2 className="text-base sm:text-lg font-semibold text-foreground hidden sm:block">
            Zaago Seller Dashboard
          </h2>
          <h2 className="text-sm font-semibold text-foreground sm:hidden">
            Dashboard
          </h2>
          
          {/* Location Display */}
          <div className="flex items-center gap-2 mt-1">
            {locationLoading ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Navigation className="h-3 w-3 animate-spin" />
                <span className="text-xs">Getting location...</span>
              </div>
            ) : location ? (
              <button
                onClick={() => setShowLocationSelector(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <MapPin className="h-3 w-3 text-green-500" />
                <span className="truncate max-w-[150px] sm:max-w-[200px] text-xs">
                  {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setShowLocationSelector(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MapPin className="h-3 w-3" />
                <span className="text-xs">Enable location</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      
      <div className="flex items-center gap-2 sm:gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-1 sm:gap-2 text-secondary">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm hidden sm:inline truncate max-w-24 lg:max-w-none">{user.email}</span>
            </div>
            <Link 
              to="/" 
              className="text-primary font-semibold text-xs sm:text-sm hover:text-primary/80 transition-colors cursor-pointer"
            >
              Seller Dashboard
            </Link>
          </>
        ) : (
          <Link 
            to="/" 
            className="text-primary font-semibold text-xs sm:text-sm hover:text-primary/80 transition-colors cursor-pointer"
          >
            Seller Dashboard
          </Link>
        )}
      </div>

      <LocationSelector 
        open={showLocationSelector} 
        onOpenChange={setShowLocationSelector} 
      />
    </motion.header>
  );
}