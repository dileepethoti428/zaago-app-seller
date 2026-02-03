import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Package, IndianRupee, Target, BarChart3, LineChart, AreaChart } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart as RechartsAreaChart,
  Area,
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  usePerformanceTrends,
  usePerformanceSummary,
  TimeRange,
  MetricType,
  ChartType,
  TrendDataPoint
} from '@/hooks/usePerformanceTrends';
import { cn } from '@/lib/utils';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' }
];

const METRIC_TABS: { value: MetricType; label: string; icon: React.ReactNode }[] = [
  { value: 'orders', label: 'Orders', icon: <Package className="h-4 w-4" /> },
  { value: 'revenue', label: 'Revenue', icon: <IndianRupee className="h-4 w-4" /> },
  { value: 'efficiency', label: 'Efficiency', icon: <Target className="h-4 w-4" /> }
];

const CHART_TYPES: { value: ChartType; icon: React.ReactNode }[] = [
  { value: 'area', icon: <AreaChart className="h-4 w-4" /> },
  { value: 'line', icon: <LineChart className="h-4 w-4" /> },
  { value: 'stacked', icon: <BarChart3 className="h-4 w-4" /> }
];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, isLoading }) => (
  <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50 border">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-xs font-medium">{title}</span>
    </div>
    {isLoading ? (
      <Skeleton className="h-6 w-16" />
    ) : (
      <span className="text-lg font-bold">{value}</span>
    )}
    {description && <span className="text-xs text-muted-foreground">{description}</span>}
  </div>
);

const formatCurrency = (value: number): string => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toFixed(0)}`;
};

const CustomTooltip: React.FC<any> = ({ active, payload, label, metricType }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {metricType === 'revenue' 
              ? formatCurrency(entry.value)
              : metricType === 'efficiency'
              ? `${entry.value}%`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const renderChart = (
  data: TrendDataPoint[],
  metricType: MetricType,
  chartType: ChartType
) => {
  const getDataKey = () => {
    switch (metricType) {
      case 'orders':
        return 'total_orders';
      case 'revenue':
        return 'total_revenue';
      case 'efficiency':
        return 'completion_rate';
    }
  };

  const getYAxisFormatter = (value: number) => {
    switch (metricType) {
      case 'revenue':
        return formatCurrency(value);
      case 'efficiency':
        return `${value}%`;
      default:
        return value.toString();
    }
  };

  const chartProps = {
    data,
    margin: { top: 10, right: 10, left: 0, bottom: 0 }
  };

  const commonComponents = (
    <>
      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
      <XAxis 
        dataKey="period_label" 
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        className="text-muted-foreground"
      />
      <YAxis 
        tickFormatter={getYAxisFormatter}
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={50}
        className="text-muted-foreground"
      />
      <Tooltip content={<CustomTooltip metricType={metricType} />} />
    </>
  );

  if (chartType === 'stacked' && metricType === 'orders') {
    return (
      <BarChart {...chartProps}>
        {commonComponents}
        <Legend />
        <Bar 
          dataKey="delivered_orders" 
          name="Delivered" 
          stackId="a" 
          fill="hsl(var(--chart-2))" 
          radius={[0, 0, 0, 0]}
        />
        <Bar 
          dataKey="failed_orders" 
          name="Failed" 
          stackId="a" 
          fill="hsl(var(--destructive))" 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    );
  }

  if (chartType === 'line') {
    return (
      <RechartsLineChart {...chartProps}>
        {commonComponents}
        <Line 
          type="monotone" 
          dataKey={getDataKey()} 
          name={metricType === 'orders' ? 'Orders' : metricType === 'revenue' ? 'Revenue' : 'Completion Rate'}
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </RechartsLineChart>
    );
  }

  // Default: Area chart
  return (
    <RechartsAreaChart {...chartProps}>
      {commonComponents}
      <defs>
        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area 
        type="monotone" 
        dataKey={getDataKey()} 
        name={metricType === 'orders' ? 'Orders' : metricType === 'revenue' ? 'Revenue' : 'Completion Rate'}
        stroke="hsl(var(--primary))" 
        strokeWidth={2}
        fill="url(#colorGradient)"
      />
    </RechartsAreaChart>
  );
};

export const PerformanceTrendCard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');
  const [metricType, setMetricType] = useState<MetricType>('orders');
  const [chartType, setChartType] = useState<ChartType>('area');

  const { data: trendData, isLoading: trendsLoading } = usePerformanceTrends(timeRange);
  const { data: summary, isLoading: summaryLoading } = usePerformanceSummary(timeRange);

  const isLoading = trendsLoading || summaryLoading;
  const hasData = trendData && trendData.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Performance Trends</CardTitle>
                <CardDescription>Track your order performance over time</CardDescription>
              </div>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {TIME_RANGES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTimeRange(value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    timeRange === value 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Total Volume"
              value={summary?.total_orders ?? 0}
              icon={<Package className="h-4 w-4" />}
              isLoading={summaryLoading}
            />
            <StatCard
              title="Completion Rate"
              value={`${summary?.completion_rate ?? 0}%`}
              icon={<Target className="h-4 w-4" />}
              isLoading={summaryLoading}
            />
            <StatCard
              title="Avg Daily"
              value={summary?.avg_daily_orders ?? 0}
              icon={<TrendingUp className="h-4 w-4" />}
              isLoading={summaryLoading}
            />
            <StatCard
              title="Delivered"
              value={summary?.delivered_orders ?? 0}
              icon={<Package className="h-4 w-4 text-primary" />}
              isLoading={summaryLoading}
            />
          </div>

          {/* Metric Tabs */}
          <Tabs value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
            <div className="flex items-center justify-between">
              <TabsList className="grid w-auto grid-cols-3">
                {METRIC_TABS.map(({ value, label, icon }) => (
                  <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 px-4">
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Chart Type Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {CHART_TYPES.map(({ value, icon }) => (
                  <button
                    key={value}
                    onClick={() => setChartType(value)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      chartType === value 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={value.charAt(0).toUpperCase() + value.slice(1)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </Tabs>

          {/* Chart Area */}
          <div className="h-[280px] w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : !hasData ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No data for selected period</p>
                <p className="text-sm">Try selecting a longer time range</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {renderChart(trendData, metricType, chartType)}
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
