import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface OfflinePageProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export const OfflinePage = ({ onRetry, isRetrying }: OfflinePageProps) => {
  return (
    <div className="offline-page">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center text-center px-6"
      >
        {/* Animated Icon Container */}
        <motion.div
          className="offline-icon-container offline-icon-pulse"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <WifiOff className="w-12 h-12 text-destructive" />
        </motion.div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mt-6 mb-2">
          You're Offline
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground text-base mb-8 max-w-xs">
          Please check your internet connection and try again
        </p>

        {/* Retry Button */}
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          size="lg"
          className="min-w-[140px] gap-2"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Retry
            </>
          )}
        </Button>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground mt-6 max-w-[280px]">
          The page will automatically refresh when your connection is restored
        </p>
      </motion.div>
    </div>
  );
};
