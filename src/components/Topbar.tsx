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
      className="bg-zaago-card shadow-card border-b border-zaago-border px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <SidebarTrigger className="md:hidden p-1.5 sm:p-2 rounded-xl sm:rounded-2xl zaago-button-ghost text-zaago-card-foreground" />
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base sm:text-lg font-semibold text-zaago-card-foreground hidden sm:block">
            Seller
          </h2>
          <h2 className="text-sm font-semibold text-zaago-card-foreground sm:hidden">
            Seller
          </h2>
          
          {/* Location Display */}
          <div className="flex items-center gap-1.5">
            {locationLoading ? (
              <div className="flex items-center gap-1 text-xs text-zaago-muted-foreground">
                <Navigation className="h-3 w-3 animate-spin" />
                <span className="text-xs">Getting location...</span>
              </div>
            ) : location ? (
              <button
                onClick={() => setShowLocationSelector(true)}
                className="flex items-center gap-1 text-xs text-zaago-muted-foreground hover:text-zaago-card-foreground transition-colors cursor-pointer"
              >
                <MapPin className="h-3 w-3 text-green-500" />
                <span className="truncate max-w-[150px] sm:max-w-[200px] text-xs">
                  {location.address || (location.city && location.state ? `${location.city}, ${location.state}` : 'Unknown location')}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setShowLocationSelector(true)}
                className="flex items-center gap-1 text-xs text-zaago-muted-foreground hover:text-zaago-card-foreground transition-colors"
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
            <div className="flex items-center gap-1 sm:gap-2 text-zaago-muted-foreground">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm hidden sm:inline truncate max-w-24 lg:max-w-none">{user.email}</span>
            </div>
            <Link 
              to="/" 
              className="text-zaago-primary font-semibold text-xs sm:text-sm hover:text-zaago-primary/80 transition-colors cursor-pointer"
            >
              Seller
            </Link>
          </>
        ) : (
          <Link 
            to="/" 
            className="text-zaago-primary font-semibold text-xs sm:text-sm hover:text-zaago-primary/80 transition-colors cursor-pointer"
          >
            Seller
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