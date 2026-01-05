import React from 'react';
import { motion } from 'framer-motion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { isNativeMobile } from '@/utils/capacitorDetect';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
  className = '',
}) => {
  const { pullDistance, isRefreshing, isPulling, containerRef } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled,
  });

  // Don't wrap if not on native mobile
  if (!isNativeMobile()) {
    return <>{children}</>;
  }

  const progress = Math.min(pullDistance / 80, 1);
  const showIndicator = isPulling || isRefreshing;

  return (
    <div 
      ref={containerRef}
      className={`ptr-container relative h-full w-full overflow-y-auto ${className}`}
      style={{ 
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull indicator */}
      {showIndicator && (
        <motion.div
          className="ptr-indicator absolute left-1/2 z-50 flex items-center justify-center"
          initial={{ y: -60, x: '-50%' }}
          animate={{ 
            y: isRefreshing ? 16 : pullDistance - 60,
            x: '-50%',
            opacity: isRefreshing ? 1 : progress,
            scale: isRefreshing ? 1 : 0.5 + progress * 0.5,
          }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 30,
            opacity: { duration: 0.1 },
          }}
        >
          <div className="ptr-spinner-container rounded-full bg-background shadow-lg p-2">
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: progress * 360 }}
              transition={isRefreshing ? { 
                duration: 0.8, 
                repeat: Infinity, 
                ease: 'linear' 
              } : { 
                duration: 0 
              }}
            >
              <Loader2 
                className={`h-7 w-7 ${isRefreshing ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Content with pull offset */}
      <motion.div
        animate={{ 
          y: isRefreshing ? 60 : (isPulling ? pullDistance * 0.3 : 0)
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 30 
        }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
};
