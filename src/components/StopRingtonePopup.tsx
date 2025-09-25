import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VolumeX, Volume2 } from 'lucide-react';
import { notificationSound, stopContinuousRinging } from '@/utils/notificationSound';

export const StopRingtonePopup: React.FC = () => {
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    // Check if continuous ringing is active
    const checkRingingStatus = () => {
      const audioStatus = notificationSound.getAudioStatus();
      setIsRinging(audioStatus.isContinuousRinging);
    };

    // Check initially
    checkRingingStatus();

    // Check periodically
    const interval = setInterval(checkRingingStatus, 500);

    return () => clearInterval(interval);
  }, []);

  const handleStopRingtone = () => {
    stopContinuousRinging();
    setIsRinging(false);
  };

  if (!isRinging) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce">
      <Card className="bg-orange-600 border-orange-700 shadow-2xl">
        <div className="p-4 flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-white animate-pulse" />
          <span className="text-white font-medium">Ringtone Playing</span>
          <Button
            onClick={handleStopRingtone}
            size="sm"
            variant="secondary"
            className="bg-white text-orange-600 hover:bg-gray-100 flex items-center gap-1"
          >
            <VolumeX className="h-4 w-4" />
            Stop
          </Button>
        </div>
      </Card>
    </div>
  );
};