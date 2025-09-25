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
                New Order Ringtone: Rapido Style
              </Label>
              <p className="text-xs text-muted-foreground">
                Loud and urgent ringtone designed to grab attention like Rapido notifications
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testRingtone(selectedRingtone)}
                className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200"
              >
                🔔 Test Rapido Ringtone
              </Button>
            </div>



            {/* Continuous Ringing Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-foreground">Continuous Ringing (for New Orders)</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="continuous-ringing">Enable Continuous Ringing</Label>
                  <p className="text-sm text-muted-foreground">
                    Ring continuously until you respond to new orders (like Rapido)
                  </p>
                </div>
                <Switch
                  id="continuous-ringing"
                  checked={continuousRingingEnabled}
                  onCheckedChange={handleContinuousRingingToggle}
                />
              </div>

              {continuousRingingEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="max-repetitions">
                      Max Repetitions: {maxRepetitions} ({Math.round(maxRepetitions * 5 / 60)} minutes)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Maximum number of times to repeat before auto-stopping
                    </p>
                    <Slider
                      id="max-repetitions"
                      min={6}
                      max={48}
                      step={6}
                      value={[maxRepetitions]}
                      onValueChange={handleMaxRepetitionsChange}
                      className="w-full"
                    />
                  </div>

                  <Button 
                    onClick={testContinuousRinging} 
                    variant="outline" 
                    size="sm"
                    className="bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300"
                  >
                    Test Continuous Ringing (15s)
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};