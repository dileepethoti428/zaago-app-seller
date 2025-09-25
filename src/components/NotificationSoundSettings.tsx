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
  const [selectedRingtone, setSelectedRingtone] = useState<RingtoneType>('rapido_ringtone');
  const [continuousRingingEnabled, setContinuousRingingEnabled] = useState(true);
  const [maxRepetitions, setMaxRepetitions] = useState(24);

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

    // Load continuous ringing preferences
    setContinuousRingingEnabled(notificationSound.getContinuousRingingEnabled());
    setMaxRepetitions(notificationSound.getMaxRepetitions());
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

  const handleContinuousRingingToggle = (enabled: boolean) => {
    setContinuousRingingEnabled(enabled);
    notificationSound.setContinuousRingingEnabled(enabled);
  };

  const handleMaxRepetitionsChange = (value: number[]) => {
    const reps = value[0];
    setMaxRepetitions(reps);
    notificationSound.setMaxRepetitions(reps);
  };

  const testContinuousRinging = () => {
    notificationSound.startContinuousRinging('new_order_ringtone');
    setTimeout(() => {
      notificationSound.stopContinuousRinging();
    }, 15000); // Stop after 15 seconds for testing
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
            {/* All notification settings removed as requested */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};