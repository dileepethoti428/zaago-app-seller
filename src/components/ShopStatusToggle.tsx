import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock, Store } from 'lucide-react';
import { useShopStatus, formatTime12 } from '@/hooks/useShopStatus';
import { cn } from '@/lib/utils';

export const ShopStatusToggle = () => {
  const { settings, loading, saving, toggleShop, withinHours } = useShopStatus();
  const open = settings.is_shop_open;
  const scheduleClosed = open && settings.auto_schedule_enabled && !withinHours;

  return (
    <Card className={cn('border-2 transition-colors', open ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', open ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className={cn('font-semibold', open ? 'text-success' : 'text-destructive')}>
                {open ? 'Shop is Open' : 'Shop is Closed'}
              </p>
              <p className="text-xs text-muted-foreground">
                {open ? 'Customers can see your products' : 'Your products are hidden from Zaago'}
              </p>
            </div>
          </div>
          <Switch checked={open} disabled={loading || saving} onCheckedChange={toggleShop} aria-label="Shop open status" />
        </div>
        {!loading && !open && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            You manually turned your shop off. Customers cannot order.
          </div>
        )}
        {!loading && scheduleClosed && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
            <Clock className="h-4 w-4 shrink-0" />
            Shop is currently closed by schedule (Opens at {formatTime12(settings.opening_time)} IST).
          </div>
        )}
      </CardContent>
    </Card>
  );
};
