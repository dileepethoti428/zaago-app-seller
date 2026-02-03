import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Package, ShoppingBag, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopProductsAnalytics, type TimePeriod, type SortBy } from '@/hooks/useTopProductsAnalytics';

const timePeriodOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' }
];

const sortByOptions = [
  { value: 'revenue', label: 'Revenue', icon: DollarSign },
  { value: 'orders', label: 'Orders', icon: ShoppingBag },
  { value: 'quantity', label: 'Quantity', icon: Package }
];

export const TopProductsCard = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [sortBy, setSortBy] = useState<SortBy>('revenue');

  const { data: topProducts, isLoading, error } = useTopProductsAnalytics(timePeriod, sortBy, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
    >
      <Card className="bg-zaago-card/50 border-zaago-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-zaago-green" />
              Top Products
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-transparent border-zaago-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zaago-card border-zaago-border">
                  {timePeriodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-foreground hover:bg-zaago-accent text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="w-[110px] h-8 text-xs bg-transparent border-zaago-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zaago-card border-zaago-border">
                  {sortByOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-foreground hover:bg-zaago-accent text-xs">
                      <div className="flex items-center gap-1">
                        <option.icon className="w-3 h-3" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zaago-accent/20">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load top products
            </div>
          ) : !topProducts || topProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-zaago-muted-foreground mb-3" />
              <p className="text-zaago-muted-foreground">No sales data for selected period</p>
              <p className="text-zaago-muted-foreground text-sm mt-1">Start selling to see your top products here!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((product, index) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zaago-accent/20 hover:bg-zaago-accent/40 transition-colors"
                >
                  <div className="relative">
                    <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-zaago-green text-background text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    {product.product_image_url ? (
                      <img
                        src={product.product_image_url}
                        alt={product.product_name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-zaago-accent flex items-center justify-center">
                        <Package className="w-6 h-6 text-zaago-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{product.product_name}</p>
                    <div className="flex items-center gap-3 text-xs text-zaago-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        {product.total_orders} orders
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {product.total_quantity} sold
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-zaago-green text-sm">{formatCurrency(product.total_revenue)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
