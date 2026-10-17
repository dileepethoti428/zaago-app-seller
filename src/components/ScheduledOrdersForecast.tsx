import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { CalendarClock, Package, Target, ShoppingBag, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  orders: any[];
  dates: string[];
  selected: string;
  onSelectedChange: (d: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const formatDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export const ScheduledOrdersForecast = ({ orders, dates, selected, onSelectedChange, onRefresh, loading }: Props) => {
  const active = selected;
  const countFor = (d: string) => orders.filter((o) => o.delivery_date === d).length;

  const filtered = active === 'all' ? orders : orders.filter((o) => o.delivery_date === active);

  const items = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; qty: number; orders: number; dates: Set<string> }>();
    filtered.forEach((o) => {
      (o.items || []).forEach((it: any) => {
        const name = it.product_name || it.name || 'Product';
        const unit = it.unit || it.product_unit || '';
        const key = `${name}|${unit}`;
        const e = map.get(key) || { name, unit, qty: 0, orders: 0, dates: new Set<string>() };
        e.qty += Number(it.quantity) || 1;
        e.orders += 1;
        if (o.delivery_date) e.dates.add(o.delivery_date);
        map.set(key, e);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [filtered]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Card className="bg-zaago-card/50 border-zaago-border overflow-hidden">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <CalendarClock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Book Now, Get Later Forecast</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                📅 {active === 'all' ? 'All upcoming deliveries' : formatDate(active)} • What to prepare
              </p>
            </div>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="bg-transparent border-zaago-border">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
        <div className="pt-3">
          <Select value={active} onValueChange={onSelectedChange}>
            <SelectTrigger className="w-full sm:w-64 border-amber-500/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dates.map((d) => (
                <SelectItem key={d} value={d}>
                  {formatDate(d)} ({countFor(d)} {countFor(d) === 1 ? 'order' : 'orders'})
                </SelectItem>
              ))}
              <SelectItem value="all">All Upcoming ({orders.length} orders)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1.5 text-sm">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            {totalItems} Total Items
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1.5 text-sm">
            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
            {filtered.length} Scheduled Orders
          </Badge>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <CalendarClock className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No upcoming bookings</h3>
            <p className="text-sm text-muted-foreground">Book Now, Get Later orders will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((item, index) => (
              <motion.div
                key={`${item.name}|${item.unit}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-muted/50 border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm text-foreground flex-1 pr-2 line-clamp-2">
                    {item.name}
                    {item.unit && <span className="text-muted-foreground font-normal"> ({item.unit})</span>}
                  </h4>
                  <Package className="h-4 w-4 text-amber-500 flex-shrink-0" />
                </div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                  × {item.qty}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
                    {item.orders} {item.orders === 1 ? 'order' : 'orders'}
                  </Badge>
                  {active === 'all' && item.dates.size > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                      {item.dates.size === 1 ? formatDate([...item.dates][0]) : `${item.dates.size} days`}
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
