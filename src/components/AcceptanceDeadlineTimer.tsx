import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getCurrentISTTime } from '@/utils/timeZone';
import { differenceInSeconds, setHours, setMinutes, setSeconds } from 'date-fns';

interface AcceptanceDeadlineTimerProps {
  deliveryDate: string;
}

export const AcceptanceDeadlineTimer = ({ deliveryDate }: AcceptanceDeadlineTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = getCurrentISTTime();
      const todayIST = now.toISOString().split('T')[0];
      
      // Only show timer if delivery date is today
      if (deliveryDate !== todayIST) {
        setTimeLeft('');
        return;
      }

      // Set deadline to 11:00 PM IST today
      const deadline = setSeconds(setMinutes(setHours(now, 23), 0), 0);
      const secondsLeft = differenceInSeconds(deadline, now);

      if (secondsLeft <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = secondsLeft % 60;

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deliveryDate]);

  if (!timeLeft) return null;

  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md ${
      isExpired 
        ? 'bg-destructive/10 text-destructive' 
        : 'bg-orange-500/10 text-orange-600'
    }`}>
      <Clock className="h-3.5 w-3.5" />
      <span className="font-medium">
        {isExpired ? 'Deadline Passed' : `Accept by 11:00 PM IST: ${timeLeft}`}
      </span>
    </div>
  );
};
