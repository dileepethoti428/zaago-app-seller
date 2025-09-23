import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { notificationSound } from '@/utils/notificationSound';
import { useToast } from '@/hooks/use-toast';

export const AudioTestButton = () => {
  const { toast } = useToast();

  const testAudio = async () => {
    try {
      console.log('🔊 Testing audio...');
      await notificationSound.ensureAudioContext();
      await notificationSound.playNotificationSound('phone_ringtone');
      
      toast({
        title: "Audio Test",
        description: "If you can hear the ringtone, audio is working properly!",
        duration: 5000,
        className: "bg-blue-600 text-white border-blue-600"
      });
    } catch (error) {
      console.error('🔊 Audio test failed:', error);
      toast({
        title: "Audio Test Failed",
        description: "Audio notifications may not work. Please check your browser settings.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      onClick={testAudio}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Volume2 className="h-4 w-4" />
      Test Audio
    </Button>
  );
};