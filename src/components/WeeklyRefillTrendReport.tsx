import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Download, 
  RefreshCw, 
  FileText,
  BarChart3,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useWeeklyRefillTrend, DailyTrendData } from '@/hooks/useWeeklyRefillTrend';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type ChartFilter = 'all' | 'sold' | 'forecast' | 'refill';

export const WeeklyRefillTrendReport = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    products,
    chartData,
    dateRange,
    totalRefillQuantity,
    top3Products,
    isLoading,
    error,
    sellerName,
    refetch
  } = useWeeklyRefillTrend();

  const [chartFilter, setChartFilter] = useState<ChartFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Weekly trend data updated',
    });
  };

  const handleDownloadCSV = async () => {
    if (products.length === 0 || !user?.id) return;
    
    setIsDownloadingCSV(true);
    try {
      const response = await fetch(
        'https://amhpjsmubciahslghobw.supabase.co/functions/v1/export-stock-report',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'weekly-report',
            format: 'csv',
            sellerId: user.id,
            sellerName,
            dateRange,
            data: products,
          }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate report');
      }
      
      window.location.href = result.fileUrl;
      toast({
        title: 'Downloaded',
        description: 'Weekly refill report downloaded as CSV',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download CSV',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (products.length === 0 || !user?.id) return;
    
    setIsDownloadingPDF(true);
    try {
      const response = await fetch(
        'https://amhpjsmubciahslghobw.supabase.co/functions/v1/export-stock-report',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'weekly-report',
            format: 'pdf',
            sellerId: user.id,
            sellerName,
            dateRange,
            data: products,
          }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate report');
      }
      
      window.location.href = result.fileUrl;
      toast({
        title: 'Downloaded',
        description: 'Weekly refill report downloaded',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const hasData = products.length > 0 || chartData.some(d => d.sold > 0 || d.forecast > 0);
  const hasRefillData = products.some(p => p.totalRefillQuantity > 0);

  // Filter chart data based on selection
  const getFilteredChartData = (): DailyTrendData[] => {
    return chartData;
  };

  const filterButtons: { key: ChartFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sold', label: 'Sold' },
    { key: 'forecast', label: 'Forecast' },
    { key: 'refill', label: 'Refill' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
    >
      <Card className="bg-zaago-card/50 border-zaago-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Weekly Refill Trend Report
                </CardTitle>
                <p className="text-zaago-muted-foreground text-sm">
                  Last 7 days • {dateRange.start} to {dateRange.end}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={!hasRefillData || isLoading || isDownloadingCSV}
                className="gap-1.5 text-xs"
              >
                {isDownloadingCSV ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={!hasRefillData || isLoading || isDownloadingPDF}
                className="gap-1.5 text-xs"
              >
                {isDownloadingPDF ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                className="gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : !hasData ? (
            <div className="text-center py-8 text-zaago-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No order data available for the last 7 days</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{totalRefillQuantity}</p>
                  <p className="text-xs text-zaago-muted-foreground">Total Refill Qty</p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{products.length}</p>
                  <p className="text-xs text-zaago-muted-foreground">Products</p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {chartData.reduce((sum, d) => sum + d.sold, 0)}
                  </p>
                  <p className="text-xs text-zaago-muted-foreground">Total Sold</p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {chartData.reduce((sum, d) => sum + d.forecast, 0)}
                  </p>
                  <p className="text-xs text-zaago-muted-foreground">Total Forecast</p>
                </div>
              </div>

              {/* Chart Filter Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-zaago-muted-foreground">Show:</span>
                {filterButtons.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={chartFilter === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartFilter(key)}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {/* Trend Chart */}
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getFilteredChartData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="dayLabel" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Legend />
                    {(chartFilter === 'all' || chartFilter === 'sold') && (
                      <Bar dataKey="sold" name="Sold" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    )}
                    {(chartFilter === 'all' || chartFilter === 'forecast') && (
                      <Bar dataKey="forecast" name="Forecast" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    )}
                    {(chartFilter === 'all' || chartFilter === 'refill') && (
                      <Bar dataKey="refillNeeded" name="Refill Needed" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Product Summary Table */}
              {products.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zaago-border">
                        <th className="text-left py-2 px-2 text-zaago-muted-foreground font-medium">Product</th>
                        <th className="text-center py-2 px-2 text-zaago-muted-foreground font-medium">Days Refill</th>
                        <th className="text-center py-2 px-2 text-zaago-muted-foreground font-medium">Total Refill</th>
                        <th className="text-center py-2 px-2 text-zaago-muted-foreground font-medium">Avg Daily</th>
                        <th className="text-center py-2 px-2 text-zaago-muted-foreground font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice(0, 10).map((product, index) => (
                        <tr 
                          key={product.productId} 
                          className="border-b border-zaago-border/50 hover:bg-zaago-accent/30 transition-colors"
                        >
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              {index < 3 && (
                                <Badge variant="secondary" className="text-xs px-1.5">
                                  #{index + 1}
                                </Badge>
                              )}
                              <span className="text-foreground font-medium">{product.productName}</span>
                            </div>
                          </td>
                          <td className="text-center py-2 px-2 text-foreground">
                            {product.daysRefillNeeded}
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="text-primary font-semibold">{product.totalRefillQuantity}</span>
                          </td>
                          <td className="text-center py-2 px-2 text-foreground">
                            {product.avgDailyRefill.toFixed(1)}
                          </td>
                          <td className="text-center py-2 px-2 text-zaago-muted-foreground">
                            {product.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length > 10 && (
                    <p className="text-center text-xs text-zaago-muted-foreground py-2">
                      Showing top 10 of {products.length} products
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
