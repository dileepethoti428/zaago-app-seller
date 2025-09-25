import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, VolumeX } from 'lucide-react';
import { notificationSound, RingtoneType } from '@/utils/notificationSound';

export const NotificationSoundSettings = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(70);
  const [selectedRingtone, setSelectedRingtone] = useState<RingtoneType>('classic_phone');

  useEffect(() => {
    // Load preferences from localStorage and notification manager
    const savedPreference = localStorage.getItem('notificationSoundEnabled');
    if (savedPreference !== null) {
      const enabled = JSON.parse(savedPreference);
      setSoundEnabled(enabled);
      notificationSound.setEnabled(enabled);
    }

    const savedVolume = localStorage.getItem('notificationVolume');
    if (savedVolume !== null) {
      const vol = Math.round(JSON.parse(savedVolume) * 100);
      setVolume(vol);
    } else {
      setVolume(Math.round(notificationSound.getVolume() * 100));
    }

    const savedRingtone = localStorage.getItem('selectedRingtone');
    if (savedRingtone) {
      setSelectedRingtone(savedRingtone as RingtoneType);
    } else {
      setSelectedRingtone(notificationSound.getRingtone());
    }
  }, []);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    notificationSound.setEnabled(enabled);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    notificationSound.setVolume(newVolume / 100);
  };

  const handleRingtoneChange = (value: RingtoneType) => {
    setSelectedRingtone(value);
    notificationSound.setRingtone(value);
  };

  const testSound = (type: 'order' | 'delivery' | 'payment' | 'system' | 'urgent' | 'success') => {
    notificationSound.playNotificationSound(type);
  };

  const testRingtone = (ringtoneType: RingtoneType) => {
    notificationSound.playSpecificRingtone(ringtoneType);
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
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Volume: {volume}%
              </Label>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                New Order Ringtone
              </Label>
              <Select value={selectedRingtone} onValueChange={handleRingtoneChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ringtone" />
                </SelectTrigger>
                <SelectContent>
                  {notificationSound.getRingtoneOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testRingtone(selectedRingtone)}
                className="w-full"
              >
                Test Selected Ringtone
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Test all ringtones:</h4>
              <div className="grid grid-cols-2 gap-2">
                {notificationSound.getRingtoneOptions().map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() => testRingtone(option.value)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Test other sounds:</h4>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};