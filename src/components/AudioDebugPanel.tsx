import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, Play, Square } from 'lucide-react';
import { notificationSound } from '@/utils/notificationSound';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export const AudioDebugPanel = () => {
  const { toast } = useToast();
  const [audioStatus, setAudioStatus] = useState<any>(null);

  useEffect(() => {
    const checkStatus = () => {
      const status = notificationSound.getAudioStatus();
      setAudioStatus(status);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const testNewOrderRingtone = async () => {
    try {
      console.log('🔊 Testing new order ringtone...');
      await notificationSound.ensureAudioContext();
      notificationSound.startContinuousRinging('rapido_ringtone');
      
      toast({
        title: "New Order Ringtone Test",
        description: "Playing continuous ringtone for new order simulation",
        duration: 3000,
        className: "bg-green-600 text-white border-green-600"
      });
    } catch (error) {
      console.error('🔊 New order ringtone test failed:', error);
      toast({
        title: "Ringtone Test Failed",
        description: String(error),
        variant: "destructive"
      });
    }
  };

  const stopRingtone = () => {
    notificationSound.stopContinuousRinging();
    toast({
      title: "Ringtone Stopped",
      description: "Continuous ringtone has been stopped",
      duration: 2000
    });
  };

  const testBasicSound = async () => {
    try {
      await notificationSound.playNotificationSound('urgent');
      toast({
        title: "Basic Sound Test",
        description: "Playing basic urgent sound",
        duration: 2000
      });
    } catch (error) {
      console.error('Basic sound test failed:', error);
      toast({
        title: "Basic Sound Failed",
        description: String(error),
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Audio Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p><strong>Status:</strong> {audioStatus?.status}</p>
          <p><strong>Can Play:</strong> {audioStatus?.canPlay ? 'Yes' : 'No'}</p>
          <p><strong>Continuous Ringing:</strong> {audioStatus?.isContinuousRinging ? 'Active' : 'Inactive'}</p>
          {audioStatus?.message && <p><strong>Message:</strong> {audioStatus.message}</p>}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={testNewOrderRingtone}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Test New Order Ringtone
          </Button>
          
          <Button 
            onClick={stopRingtone}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop Ringtone
          </Button>
          
          <Button 
            onClick={testBasicSound}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Volume2 className="h-4 w-4" />
            Test Basic Sound
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};