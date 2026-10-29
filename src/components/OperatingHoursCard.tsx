import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { useShopStatus } from '@/hooks/useShopStatus';
import { ShopStatusToggle } from '@/components/ShopStatusToggle';

export const OperatingHoursCard = () => {
  const { settings, loading, saving, saveTimings } = useShopStatus();
  const [open, setOpen] = useState('06:00');
  const [close, setClose] = useState('22:00');
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (loading) return;
    setOpen(settings.opening_time.slice(0, 5));
    setClose(settings.closing_time.slice(0, 5));
    setAuto(settings.auto_schedule_enabled);
  }, [loading, settings]);

  return (
    <Card className="zaago-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Operating Timings & Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ShopStatusToggle />
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="auto-schedule" className="leading-snug">Auto open and close shop based on timings</Label>
          <Switch id="auto-schedule" checked={auto} onCheckedChange={setAuto} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="opening-time">Opening time</Label>
            <Input id="opening-time" type="time" value={open} onChange={(e) => setOpen(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="closing-time">Closing time</Label>
            <Input id="closing-time" type="time" value={close} onChange={(e) => setClose(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          All times are India Standard Time (IST). When auto is off, the shop opens/closes only with the switch on your dashboard.
        </p>
        <Button className="w-full" disabled={loading || saving || !open || !close} onClick={() => saveTimings(open, close, auto)}>
          {saving ? 'Saving...' : 'Save Timings'}
        </Button>
      </CardContent>
    </Card>
  );
};
