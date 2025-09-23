import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Volume2, VolumeX } from 'lucide-react';
import { notificationSound } from '@/utils/notificationSound';

export const NotificationSoundSettings = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Load sound preference from localStorage
    const savedPreference = localStorage.getItem('notificationSoundEnabled');
    if (savedPreference !== null) {
      const enabled = JSON.parse(savedPreference);
      setSoundEnabled(enabled);
      notificationSound.setEnabled(enabled);
    }
  }, []);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    notificationSound.setEnabled(enabled);
    localStorage.setItem('notificationSoundEnabled', JSON.stringify(enabled));
  };

  const testSound = (type: 'order' | 'delivery' | 'payment' | 'system' | 'urgent' | 'success') => {
    notificationSound.playNotificationSound(type);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          Notification Sounds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="sound-toggle" className="text-sm font-medium">
            Enable notification sounds
          </Label>
          <Switch
            id="sound-toggle"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
          />
        </div>

        {soundEnabled && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Test sounds:</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('order')}
                className="text-xs"
              >
                Order Sound
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('delivery')}
                className="text-xs"
              >
                Delivery Sound
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('payment')}
                className="text-xs"
              >
                Payment Sound
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('success')}
                className="text-xs"
              >
                Success Sound
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('urgent')}
                className="text-xs"
              >
                Urgent Sound
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('system')}
                className="text-xs"
              >
                System Sound
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};