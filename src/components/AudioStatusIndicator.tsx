import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Volume2, VolumeX, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { notificationSound } from '@/utils/notificationSound';
import { useToast } from '@/hooks/use-toast';

export const AudioStatusIndicator = () => {
  const [audioStatus, setAudioStatus] = useState({ status: 'checking', canPlay: false, message: 'Checking audio...' });
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkAudioStatus = async () => {
    setIsChecking(true);
    await notificationSound.ensureAudioContext();
    const status = notificationSound.getAudioStatus();
    setAudioStatus(status);
    setIsChecking(false);
  };

  useEffect(() => {
    checkAudioStatus();
    
    // Check status periodically
    const interval = setInterval(checkAudioStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const enableAudio = async () => {
    try {
      // Try to trigger audio context through user interaction
      await notificationSound.ensureAudioContext();
      await notificationSound.playNotificationSound('system');
      
      toast({
        title: "Audio Test",
        description: "If you heard the sound, audio is working!",
        className: "bg-green-600 text-white border-green-600"
      });
      
      // Recheck status
      setTimeout(checkAudioStatus, 1000);
    } catch (error) {
      toast({
        title: "Audio Enable Failed",
        description: "Please check your browser settings and try again",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = () => {
    switch (audioStatus.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'suspended':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'blocked':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <VolumeX className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (audioStatus.status) {
      case 'ready':
        return 'border-green-200 bg-green-50';
      case 'suspended':
        return 'border-yellow-200 bg-yellow-50';
      case 'blocked':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const showTroubleshooting = audioStatus.status !== 'ready';

  return (
    <div className="space-y-3">
      <Alert className={getStatusColor()}>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <AlertDescription className="flex-1">
            <strong>Audio Status:</strong> {audioStatus.message}
          </AlertDescription>
          {(audioStatus.status === 'suspended' || audioStatus.status === 'blocked') && (
            <Button
              onClick={enableAudio}
              size="sm"
              variant="outline"
              disabled={isChecking}
              className="ml-2"
            >
              <Volume2 className="h-3 w-3 mr-1" />
              {isChecking ? 'Testing...' : 'Enable Audio'}
            </Button>
          )}
        </div>
      </Alert>

      {showTroubleshooting && (
        <div className="text-xs space-y-2 p-3 bg-muted rounded-lg">
          <div className="font-medium text-foreground">Troubleshooting Tips:</div>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-start gap-2">
              <Volume2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Check your browser's audio settings and allow notifications
            </li>
            <li className="flex items-start gap-2">
              <Smartphone className="h-3 w-3 mt-0.5 flex-shrink-0" />
              On mobile: Check if device is in silent mode or do not disturb
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              Click anywhere on the page to activate audio
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};