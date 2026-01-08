import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  Package, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Check,
  ShoppingCart,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { useStockAlerts, StockAlert } from '@/hooks/useStockAlerts';
import { useRestockList } from '@/hooks/useRestockList';
import { UpdateStockModal } from './UpdateStockModal';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// Alert Card Component
const AlertCard = ({ 
  alert, 
  onMarkRefilled, 
  onAddToList,
  isInList 
}: { 
  alert: StockAlert;
  onMarkRefilled: () => void;
  onAddToList: () => void;
  isInList: boolean;
}) => {
  const getUnitLabel = (unit: string) => {
    const unitMap: Record<string, string> = {
      'litre': 'L',
      'liter': 'L',
      'kg': 'kg',
      'kilogram': 'kg',
      'piece': 'pcs',
      'pieces': 'pcs',
      'packet': 'pkt',
      'pack': 'pkt',
    };
    return unitMap[unit.toLowerCase()] || unit;
  };

  const unitLabel = getUnitLabel(alert.unit);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 hover:border-orange-500/50 transition-colors">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-foreground text-sm truncate max-w-[140px]">
                {alert.productName}
              </span>
            </div>
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-500 border-orange-500/30">
              Low Stock
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-zaago-accent/30 rounded-lg p-2">
              <p className="text-zaago-muted-foreground">Current</p>
              <p className="font-semibold text-foreground">{alert.currentStock} {unitLabel}</p>
            </div>
            <div className="bg-zaago-accent/30 rounded-lg p-2">
              <p className="text-zaago-muted-foreground">Sold Today</p>
              <p className="font-semibold text-foreground">{alert.soldToday} {unitLabel}</p>
            </div>
            <div className="bg-zaago-accent/30 rounded-lg p-2">
              <p className="text-zaago-muted-foreground">Need Tomorrow</p>
              <p className="font-semibold text-foreground">{alert.requiredTomorrow} {unitLabel}</p>
            </div>
            <div className="bg-red-500/20 rounded-lg p-2 border border-red-500/30">
              <p className="text-red-400 text-[10px]">REFILL</p>
              <p className="font-bold text-red-500">{alert.refillNeeded} {unitLabel}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onMarkRefilled}
              className="flex-1 bg-zaago-green hover:bg-zaago-green/90 text-white text-xs h-8"
            >
              <Package className="w-3 h-3 mr-1" />
              Refill
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddToList}
              disabled={isInList}
              className="flex-1 border-zaago-border text-foreground text-xs h-8"
            >
              {isInList ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  In List
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 mr-1" />
                  Add to List
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="bg-zaago-card/50 border-zaago-border">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-16 h-16 rounded-full bg-zaago-green/10 flex items-center justify-center mb-4">
      <Check className="w-8 h-8 text-zaago-green" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-1">All Stocked Up!</h3>
    <p className="text-zaago-muted-foreground text-sm max-w-xs">
      Your inventory levels are sufficient for tomorrow's subscriptions.
    </p>
  </div>
);

// Main Component
export const StockAlertsRefillSuggestions = () => {
  const { user } = useAuth();
  const { alerts, totalLowStockItems, totalRefillQuantity, lastUpdated, isLoading, error, refetch, sellerName } = useStockAlerts();
  const { addToList, isInList, isAddingToList } = useRestockList();
  
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    currentStock: number;
    unit: string;
    suggestedRefill?: number;
  } | null>(null);
  const [isRefillSuggestionsOpen, setIsRefillSuggestionsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleMarkRefilled = (alert: StockAlert) => {
    setSelectedProduct({
      id: alert.productId,
      name: alert.productName,
      currentStock: alert.currentStock,
      unit: alert.unit,
      suggestedRefill: alert.refillNeeded,
    });
  };

  const handleAddToList = (alert: StockAlert) => {
    addToList({
      productId: alert.productId,
      quantity: alert.refillNeeded,
      notes: `Sold ${alert.soldToday} + Need ${alert.requiredTomorrow} tomorrow`,
    });
  };

  const handleDownloadCSV = async () => {
    if (!user?.id || alerts.length === 0) return;
    
    setIsDownloadingCSV(true);
    try {
      const response = await fetch(
        'https://amhpjsmubciahslghobw.supabase.co/functions/v1/export-stock-report',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'refill-list',
            format: 'csv',
            sellerId: user.id,
            sellerName,
            data: alerts.map(a => ({
              productName: a.productName,
              currentStock: a.currentStock,
              soldToday: a.soldToday,
              requiredTomorrow: a.requiredTomorrow,
              refillNeeded: a.refillNeeded,
              unit: a.unit,
            })),
          }),
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate report');
      }
      
      // Navigate to the file URL for download
      window.location.href = result.fileUrl;
      toast.success('Refill list downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download CSV');
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  const handleDownloadPDF = () => {
    toast.info('PDF export coming soon. Please use CSV for now.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="bg-zaago-card/50 border-zaago-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Stock Alerts & Refill Suggestions
              </CardTitle>
              <p className="text-xs sm:text-sm text-zaago-muted-foreground mt-1">
                Based on today's sales + tomorrow's subscriptions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={alerts.length === 0 || isLoading || isDownloadingCSV}
                className="text-xs border-zaago-border"
              >
                {isDownloadingCSV ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Download className="w-3 h-3 mr-1" />
                )}
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={alerts.length === 0 || isLoading}
                className="text-xs border-zaago-border"
              >
                <FileText className="w-3 h-3 mr-1" />
                PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              className="text-zaago-muted-foreground hover:text-foreground"
            >
                <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary Badges */}
          {!isLoading && !error && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge 
                variant={totalLowStockItems > 0 ? "destructive" : "secondary"}
                className={totalLowStockItems > 0 
                  ? "bg-red-500/20 text-red-500 border-red-500/30" 
                  : "bg-zaago-accent text-zaago-muted-foreground"
                }
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {totalLowStockItems} Low-Stock Items
              </Badge>
              {totalRefillQuantity > 0 && (
                <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
                  <Package className="w-3 h-3 mr-1" />
                  {totalRefillQuantity} units to refill
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Error State */}
          {error && (
            <div className="text-center py-6">
              <p className="text-red-500 text-sm mb-2">Failed to load stock alerts</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && <LoadingSkeleton />}

          {/* Empty State */}
          {!isLoading && !error && alerts.length === 0 && <EmptyState />}

          {/* Alert Cards */}
          {!isLoading && !error && alerts.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.productId}
                    alert={alert}
                    onMarkRefilled={() => handleMarkRefilled(alert)}
                    onAddToList={() => handleAddToList(alert)}
                    isInList={isInList(alert.productId)}
                  />
                ))}
              </div>

              {/* Refill Suggestions Collapsible */}
              <Collapsible open={isRefillSuggestionsOpen} onOpenChange={setIsRefillSuggestionsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-zaago-muted-foreground hover:text-foreground py-2"
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Refill Suggestions ({alerts.length})
                    </span>
                    {isRefillSuggestionsOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2 p-3 bg-zaago-accent/30 rounded-lg">
                    {alerts.map((alert) => (
                      <div
                        key={alert.productId}
                        className="flex items-center justify-between py-2 border-b border-zaago-border/50 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-foreground text-sm">{alert.productName}</p>
                          <p className="text-xs text-zaago-muted-foreground">
                            Sold {alert.soldToday} + Need {alert.requiredTomorrow} &gt; Stock {alert.currentStock}
                          </p>
                        </div>
                        <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
                          +{alert.refillNeeded} {alert.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Last Updated */}
          {lastUpdated && !isLoading && (
            <p className="text-xs text-zaago-muted-foreground text-center mt-4">
              Last updated: {format(lastUpdated, 'h:mm a')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Update Stock Modal */}
      <UpdateStockModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onSuccess={refetch}
      />
    </motion.div>
  );
};
