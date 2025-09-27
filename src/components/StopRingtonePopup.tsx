import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VolumeX, Volume2, Clock } from 'lucide-react';
import { notificationSound, stopContinuousRinging } from '@/utils/notificationSound';

export const StopRingtonePopup: React.FC = () => {
  const [isRinging, setIsRinging] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Check if continuous ringing is active
    const checkRingingStatus = () => {
      const audioStatus = notificationSound.getAudioStatus();
      setIsRinging(audioStatus.isContinuousRinging);
      if (audioStatus.isContinuousRinging && audioStatus.remainingTime) {
        setCountdown(Math.ceil(audioStatus.remainingTime / 1000));
      }
    };

    // Check initially
    checkRingingStatus();

    // Check periodically
    const interval = setInterval(checkRingingStatus, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Add keyboard shortcut for ESC key
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isRinging) {
        handleStopRingtone();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isRinging]);

  const handleStopRingtone = () => {
    stopContinuousRinging();
    setIsRinging(false);
  };

  if (!isRinging) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 pointer-events-none">
      <div className="pointer-events-auto">
        <Card className="bg-red-600 border-red-700 shadow-2xl animate-pulse border-4">
          <div className="p-6 flex items-center gap-4">
            <div className="relative">
              <Volume2 className="h-8 w-8 text-white animate-bounce" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
            </div>
            <div className="flex-1">
              <div className="text-white font-bold text-lg">🔔 NEW ORDER ALERT!</div>
              <div className="text-red-100 text-sm flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {countdown > 0 && `Auto-stop in ${countdown}s`}
                <span className="text-xs opacity-75">• Press ESC to stop</span>
              </div>
            </div>
            <Button
              onClick={handleStopRingtone}
              size="lg"
              variant="secondary"
              className="bg-white text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold border-2 border-red-200 shadow-lg"
            >
              <VolumeX className="h-5 w-5" />
              STOP ALARM
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};