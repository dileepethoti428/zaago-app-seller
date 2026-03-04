import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CalendarOff, 
  Calendar, 
  User, 
  Package, 
  Truck, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Star,
  Circle,
  AlertTriangle,
  Settings,
  XCircle,
  RefreshCw,
  CreditCard,
  Search,
  Loader2
} from 'lucide-react';
import { useAllVacationData, VacationCompensationWithDetails } from '@/hooks/useAllVacationData';
import { 
  useUpdateCompensationType,
  useMarkCompensationDelivered,
  useCancelCompensation,
  useAssignAgentToCompensation,
  useSetCompensationDeliveryDate
} from '@/hooks/useCompensationActions';
import { useScanMissedDeliveries } from '@/hooks/useScanMissedDeliveries';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const ReasonBadge = ({ reason }: { reason: string }) => {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    vacation: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <CalendarOff className="h-3 w-3" />, label: 'Vacation' },
    delivery_failed: { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: <XCircle className="h-3 w-3" />, label: 'Delivery Failed' },
    agent_issue: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: <AlertTriangle className="h-3 w-3" />, label: 'Agent Issue' },
    technical_error: { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: <Settings className="h-3 w-3" />, label: 'Technical Error' },
    seller_failure: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: <AlertCircle className="h-3 w-3" />, label: 'Seller Issue' },
  };
  
  const cfg = config[reason] || config.delivery_failed;
  
  return (
    <Badge variant="outline" className={`${cfg.color} flex items-center gap-1`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
};

const CompensationTypeBadge = ({ type }: { type: string }) => {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    extra_delivery: { color: 'bg-green-500/10 text-green-600', icon: <Truck className="h-3 w-3" />, label: 'Extra Delivery' },
    refund: { color: 'bg-blue-500/10 text-blue-600', icon: <RefreshCw className="h-3 w-3" />, label: 'Refund' },
    credit: { color: 'bg-purple-500/10 text-purple-600', icon: <CreditCard className="h-3 w-3" />, label: 'Credit' },
  };
  
  const cfg = config[type] || config.extra_delivery;
  
  return (
    <Badge variant="secondary" className={`${cfg.color} flex items-center gap-1`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
};

const CompensationCard = ({ 
  comp, 
  showActions = true,
  agents = []
}: { 
  comp: VacationCompensationWithDetails;
  showActions?: boolean;
  agents?: { id: string; name: string }[];
}) => {
  const updateType = useUpdateCompensationType();
  const markDelivered = useMarkCompensationDelivered();
  const cancelCompensation = useCancelCompensation();
  const assignAgent = useAssignAgentToCompensation();
  const setDeliveryDate = useSetCompensationDeliveryDate();
  
  const [selectedDate, setSelectedDate] = useState(comp.compensation_delivery_date || '');

  const statusColors: Record<string, string> = {
    pending: 'border-orange-500/20 bg-orange-500/5',
    assigned: 'border-purple-500/20 bg-purple-500/5',
    delivered: 'border-green-500/20 bg-green-500/5',
    cancelled: 'border-gray-500/20 bg-gray-500/5',
  };

  const statusBadges: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', label: 'Pending' },
    assigned: { color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', label: 'Assigned' },
    delivered: { color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Delivered' },
    cancelled: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Cancelled' },
  };

  return (
    <div className={`p-4 border rounded-lg ${statusColors[comp.status]}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-semibold">
              {comp.subscription?.customer?.full_name || 'Unknown Customer'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ReasonBadge reason={comp.reason} />
            <Badge variant="outline" className={statusBadges[comp.status].color}>
              {statusBadges[comp.status].label}
            </Badge>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {comp.subscription?.customer?.phone && (
            <a 
              href={`tel:${comp.subscription.customer.phone}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>{comp.subscription.customer.phone}</span>
            </a>
          )}
          {comp.subscription?.customer?.address && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="line-clamp-1">
                {comp.subscription.customer.city || comp.subscription.customer.address}
              </span>
            </div>
          )}
        </div>

        {/* Agent Info (if assigned) */}
        {comp.delivery_agent && (
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-sm">Assigned Agent</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{comp.delivery_agent.name}</span>
                {comp.delivery_agent.is_online && (
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                )}
              </div>
              {comp.delivery_agent.phone && (
                <a 
                  href={`tel:${comp.delivery_agent.phone}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>{comp.delivery_agent.phone}</span>
                </a>
              )}
              {comp.delivery_agent.average_rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>{comp.delivery_agent.average_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product & Dates */}
        <div className="flex flex-wrap items-center gap-4 text-sm border-t pt-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{comp.subscription?.product?.name || 'Unknown Product'}</span>
            <Badge variant="secondary" className="ml-1">
              {comp.quantity || comp.subscription?.quantity || 1} units
            </Badge>
          </div>
          <CompensationTypeBadge type={comp.compensation_type} />
        </div>

        {/* Date Info */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Original Date:</span>
          <Badge variant="outline">
            {format(parseISO(comp.original_vacation_date), 'MMM d, yyyy')}
          </Badge>
          {comp.compensation_delivery_date && (
            <>
              <span className="text-muted-foreground">→ Compensation:</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {format(parseISO(comp.compensation_delivery_date), 'MMM d, yyyy')}
              </Badge>
            </>
          )}
        </div>

        {/* Actions */}
        {showActions && comp.status !== 'delivered' && comp.status !== 'cancelled' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            {/* Set Delivery Date */}
            {comp.status === 'pending' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40 h-8"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedDate) {
                      setDeliveryDate.mutate({
                        compensationId: comp.id,
                        deliveryDate: selectedDate
                      });
                    }
                  }}
                  disabled={!selectedDate || setDeliveryDate.isPending}
                >
                  Set Date
                </Button>
              </div>
            )}

            {/* Assign Agent */}
            {comp.status === 'pending' && agents.length > 0 && (
              <Select
                onValueChange={(agentId) => {
                  assignAgent.mutate({
                    compensationId: comp.id,
                    agentId,
                    deliveryDate: selectedDate || undefined
                  });
                }}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="Assign Agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Change Compensation Type */}
            <Select
              value={comp.compensation_type}
              onValueChange={(type: 'extra_delivery' | 'refund' | 'credit') => {
                updateType.mutate({
                  compensationId: comp.id,
                  compensationType: type
                });
              }}
            >
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="extra_delivery">Extra Delivery</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>

            {/* Mark as Delivered */}
            {comp.status === 'assigned' && (
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600"
                onClick={() => markDelivered.mutate(comp.id)}
                disabled={markDelivered.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Delivered
              </Button>
            )}

            {/* Cancel */}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to cancel this compensation?')) {
                  cancelCompensation.mutate({
                    compensationId: comp.id,
                    reason: 'Cancelled by seller'
                  });
                }
              }}
              disabled={cancelCompensation.isPending}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const VacationCompensations = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useAllVacationData();
  const [activeTab, setActiveTab] = useState('all');
  const { scan, isScanning, scanResult, clearResult } = useScanMissedDeliveries();

  // Fetch delivery agents for assignment
  const { data: agents = [] } = useQuery({
    queryKey: ['delivery-agents-for-assignment', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_agents')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load vacation data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { vacationPeriods = [], compensations = [], summary } = data ?? {};

  // Safe access to summary counts with fallbacks
  const vacationCount = summary?.vacationCount ?? 0;
  const deliveryFailedCount = summary?.deliveryFailedCount ?? 0;
  const agentIssueCount = summary?.agentIssueCount ?? 0;
  const summaryPendingCount = summary?.pendingCompensations ?? 0;
  const summaryAssignedCount = summary?.assignedCompensations ?? 0;
  const summaryDeliveredCount = summary?.deliveredCompensations ?? 0;

  // Filter compensations based on active tab
  const filteredCompensations = compensations.filter((c: VacationCompensationWithDetails) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'vacation') return c.reason === 'vacation';
    if (activeTab === 'delivery_failed') return c.reason === 'delivery_failed';
    if (activeTab === 'agent_issue') return c.reason === 'agent_issue';
    if (activeTab === 'technical_error') return c.reason === 'technical_error';
    if (activeTab === 'pending') return c.status === 'pending';
    if (activeTab === 'assigned') return c.status === 'assigned';
    if (activeTab === 'delivered') return c.status === 'delivered';
    return true;
  });

  const pendingList = filteredCompensations.filter((c: VacationCompensationWithDetails) => c.status === 'pending');
  const assignedList = filteredCompensations.filter((c: VacationCompensationWithDetails) => c.status === 'assigned');
  const deliveredList = filteredCompensations.filter((c: VacationCompensationWithDetails) => c.status === 'delivered');

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarOff className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Vacation Compensations</h1>
        </div>
        <Button
          onClick={() => scan(30)}
          disabled={isScanning}
          className="gap-2"
        >
          {isScanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isScanning ? 'Scanning...' : 'Scan for Missed Deliveries'}
        </Button>
      </div>

      {/* Scan Result Banner */}
      {scanResult && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-primary">
                  Scan Complete!
                </p>
                <p className="text-sm text-muted-foreground">
                  Found {scanResult.orders_found + scanResult.daily_orders_found + scanResult.stale_pending_found} undelivered orders.
                  Created {scanResult.compensations_created} new compensations.
                  {scanResult.stale_pending_found > 0 && (
                    <span className="block mt-1">
                      Including {scanResult.stale_pending_found} stale pending orders that were never delivered.
                    </span>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearResult}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <CalendarOff className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vacations</p>
                <p className="text-2xl font-bold">{summary.vacationCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{summary.deliveryFailedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{summaryPendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Truck className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold">{summaryAssignedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{summaryDeliveredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <AlertTriangle className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent Issues</p>
                <p className="text-2xl font-bold">{agentIssueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all" className="flex-1 min-w-[80px]">All</TabsTrigger>
          <TabsTrigger value="vacation" className="flex-1 min-w-[80px]">Vacation</TabsTrigger>
          <TabsTrigger value="delivery_failed" className="flex-1 min-w-[80px]">Failed</TabsTrigger>
          <TabsTrigger value="agent_issue" className="flex-1 min-w-[80px]">Agent</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 min-w-[80px]">Pending</TabsTrigger>
          <TabsTrigger value="assigned" className="flex-1 min-w-[80px]">Assigned</TabsTrigger>
          <TabsTrigger value="delivered" className="flex-1 min-w-[80px]">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-6">
          {/* Active Vacation Periods */}
          {(activeTab === 'all' || activeTab === 'vacation') && vacationPeriods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Active Vacation Periods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vacationPeriods.map((period) => (
                    <div
                      key={period.id}
                      className="p-4 border rounded-lg gap-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-semibold">
                              {period.subscription?.customer?.full_name || 'Unknown Customer'}
                            </span>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                              Active
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {period.subscription?.customer?.phone && (
                              <a 
                                href={`tel:${period.subscription.customer.phone}`}
                                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Phone className="h-4 w-4" />
                                <span>{period.subscription.customer.phone}</span>
                              </a>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm border-t pt-3 mt-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Package className="h-4 w-4" />
                              <span className="font-medium">{period.subscription?.product?.name || 'Unknown Product'}</span>
                              <Badge variant="secondary" className="ml-1">
                                {period.subscription?.quantity || 1} units
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(parseISO(period.start_date), 'MMM d')} - {format(parseISO(period.end_date), 'MMM d, yyyy')}
                              </span>
                              <Badge variant="secondary">{period.total_days} days</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Compensations */}
          {pendingList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Pending Compensation Deliveries ({pendingList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {pendingList.map((comp: VacationCompensationWithDetails) => (
                    <CompensationCard key={comp.id} comp={comp} agents={agents} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assigned Compensations */}
          {assignedList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-purple-500" />
                  Assigned Compensation Deliveries ({assignedList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignedList.map((comp: VacationCompensationWithDetails) => (
                    <CompensationCard key={comp.id} comp={comp} agents={agents} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivered Compensations */}
          {deliveredList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Completed Compensations ({deliveredList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deliveredList.map((comp: VacationCompensationWithDetails) => (
                    <CompensationCard key={comp.id} comp={comp} showActions={false} agents={agents} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {filteredCompensations.length === 0 && vacationPeriods.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No compensations found</p>
              <p className="text-sm mb-4">Click "Scan for Missed Deliveries" to detect undelivered orders and create compensation records</p>
              <Button
                onClick={() => scan(30)}
                disabled={isScanning}
                variant="outline"
                className="gap-2"
              >
                {isScanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {isScanning ? 'Scanning...' : 'Scan Now'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VacationCompensations;
