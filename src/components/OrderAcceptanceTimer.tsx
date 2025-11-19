import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OrderAcceptanceTimerProps {
  visibleUntil: string;
  isExpired: boolean;
}

export const OrderAcceptanceTimer = ({ visibleUntil, isExpired }: OrderAcceptanceTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  useEffect(() => {
    if (isExpired) {
      setTimeLeft('Expired');
      return;
    }
    
    const updateTimer = () => {
      const now = new Date();
      const deadline = new Date(visibleUntil);
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [visibleUntil, isExpired]);
  
  return (
    <Badge 
      variant={isExpired ? "destructive" : "default"}
      className="flex items-center gap-1"
    >
      <Clock className="h-3 w-3" />
      {isExpired ? 'Deadline Passed' : `Time Left: ${timeLeft}`}
    </Badge>
  );
};
