import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw, Package, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTodaySubscriptionForecast, ForecastItem, ForecastMode } from '@/hooks/useTodaySubscriptionForecast';
import { format } from 'date-fns';

const ForecastCard = ({ item, index }: { item: ForecastItem; index: number }) => {
  const getUnitLabel = (unit: string) => {
    switch (unit?.toLowerCase()) {
      case 'kg':
      case 'kilogram':
        return 'kg';
      case 'litre':
      case 'liter':
      case 'l':
        return 'litre';
      case 'piece':
      case 'pcs':
      case 'pieces':
        return 'pcs';
      case 'gram':
      case 'g':
        return 'g';
      case 'ml':
      case 'millilitre':
        return 'ml';
      default:
        return unit || 'pcs';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl bg-muted/50 border border-border hover:border-teal-500/30 hover:shadow-md hover:shadow-teal-500/5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-foreground truncate flex-1 pr-2">
          {item.productName}
        </h4>
        <Package className="h-4 w-4 text-teal-500 flex-shrink-0" />
      </div>

      <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-1">
        {item.totalQuantity}
        <span className="text-xs font-normal text-muted-foreground ml-1">
          {getUnitLabel(item.unit)}
        </span>
      </p>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <Badge
          variant="secondary"
          className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border-0"
        >
          {item.subscriptionCount} {item.subscriptionCount === 1 ? 'sub' : 'subs'}
        </Badge>
        <Badge
          variant="outline"
          className="text-[10px] border-teal-500/30 text-teal-600 dark:text-teal-400"
        >
          Subscription Forecast
        </Badge>
      </div>
    </motion.div>
  );
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border">
        <Skeleton className="h-4 w-3/4 mb-3" />
        <Skeleton className="h-8 w-1/2 mb-3" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-8"
  >
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500/10 flex items-center justify-center">
      <Calendar className="h-8 w-8 text-teal-500" />
    </div>
    <h3 className="text-lg font-medium text-foreground mb-1">No Subscriptions for {label}</h3>
    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
      There are no active subscriptions scheduled for delivery {label.toLowerCase()}.
    </p>
  </motion.div>
);

export const TodaySubscriptionForecast = () => {
  const [mode, setMode] = useState<ForecastMode>('today');
  const {
    todayFormatted,
    totalForecastItems,
    totalActiveSubscriptions,
    productForecast,
    lastUpdated,
    isLoading,
    error,
    refetch
  } = useTodaySubscriptionForecast(mode);

  const titleLabel = mode === 'today' ? "Today's" : "Tomorrow's";
  const emptyLabel = mode === 'today' ? 'Today' : 'Tomorrow';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="bg-zaago-card/50 border-zaago-border overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <TrendingUp className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {titleLabel} Subscription Forecast
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  📅 {todayFormatted || 'Loading...'} • Based on active subscriptions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={mode} onValueChange={(v) => setMode(v as ForecastMode)}>
                <TabsList className="h-9">
                  <TabsTrigger value="today" className="text-xs px-3">Today</TabsTrigger>
                  <TabsTrigger value="tomorrow" className="text-xs px-3">Tomorrow</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={isLoading}
                className="bg-transparent border-zaago-border hover:bg-zaago-accent/50"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {!isLoading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap gap-2"
            >
              <Badge
                className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-3 py-1.5 text-sm"
              >
                <Target className="h-3.5 w-3.5 mr-1.5" />
                {totalForecastItems} Total Items
              </Badge>
              <Badge
                className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-3 py-1.5 text-sm"
              >
                <Package className="h-3.5 w-3.5 mr-1.5" />
                {totalActiveSubscriptions} Active Subscriptions
              </Badge>
            </motion.div>
          )}

          {isLoading && <LoadingSkeleton />}

          {!isLoading && !error && productForecast.length === 0 && <EmptyState label={emptyLabel} />}

          {!isLoading && !error && productForecast.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {productForecast.map((item, index) => (
                <ForecastCard key={item.productId} item={item} index={index} />
              ))}
            </div>
          )}

          {!isLoading && (
            <p className="text-xs text-muted-foreground text-right pt-2">
              Last updated: {format(lastUpdated, 'h:mm:ss a')}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
