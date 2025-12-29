import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { RefreshCw, Package, ShoppingCart, Layers, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTodaysOrdersSummary,
  OrderTypeFilter,
  DateFilter,
  StatusFilter,
} from '@/hooks/useTodaysOrdersSummary';

const dateFilterLabels: Record<DateFilter, string> = {
  today: 'Today',
  week: '1 Week',
  month: '1 Month',
  all: 'All Time',
};

export const TodaysOrdersSummary = () => {
  const [orderType, setOrderType] = useState<OrderTypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch } = useTodaysOrdersSummary(
    orderType,
    dateFilter,
    statusFilter
  );

  // Update lastUpdated when data changes
  useEffect(() => {
    if (data?.lastUpdated) {
      setLastUpdated(data.lastUpdated);
    }
  }, [data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Today's Orders Summary</h2>
          <p className="text-sm text-muted-foreground">
            {dateFilterLabels[dateFilter]} • Last updated: {format(lastUpdated, 'h:mm a')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </motion.div>

      {/* Filters Section */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/50 border border-border"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Order Type</label>
              <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderTypeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="regular">Regular Orders</SelectItem>
                  <SelectItem value="subscription">Subscription Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date Range</label>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">1 Week</SelectItem>
                  <SelectItem value="month">1 Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {data?.totalOrders || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {data?.totalItems || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Products</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {data?.differentProducts || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Item Breakdown Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Item Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : data?.itemBreakdown && data.itemBreakdown.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {data.itemBreakdown.map((item, index) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/30 hover:bg-muted transition-all duration-200"
                  >
                    <h4 className="font-medium text-sm text-foreground truncate mb-1">
                      {item.productName}
                    </h4>
                    <p className="text-xl font-bold text-primary">
                      {item.totalQuantity}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {item.unit === 'litre' ? 'L' : item.unit === 'kg' ? 'kg' : 'pcs'}
                      </span>
                    </p>
                    <Badge 
                      variant="secondary" 
                      className="mt-2 text-[10px] px-1.5 py-0.5"
                    >
                      {item.orderCount} {item.orderCount === 1 ? 'order' : 'orders'}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No orders found for selected filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
