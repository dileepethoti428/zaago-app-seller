import { useState, useEffect } from 'react';
import { format, differenceInSeconds } from 'date-fns';
import { getCurrentISTTime, getNextMidnightIST } from '@/utils/timeZone';
import { Clock } from 'lucide-react';

export const ISTTimeDisplay = () => {
  const [currentTime, setCurrentTime] = useState(getCurrentISTTime());
  const [timeUntilMidnight, setTimeUntilMidnight] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getCurrentISTTime();
      setCurrentTime(now);

      const midnight = getNextMidnightIST();
      const secondsLeft = differenceInSeconds(midnight, now);
      
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = secondsLeft % 60;
      
      setTimeUntilMidnight(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">IST:</span>
        <span className="font-mono">{format(currentTime, 'hh:mm:ss a')}</span>
      </div>
      <span className="text-border">•</span>
      <div className="flex items-center gap-1.5">
        <span className="font-medium">Next refresh in:</span>
        <span className="font-mono">{timeUntilMidnight}</span>
      </div>
    </div>
  );
};
