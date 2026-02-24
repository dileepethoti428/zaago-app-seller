import { useState, useMemo, useEffect } from 'react';
import { useSellerSubscriptions, useAcceptSubscriptionDelivery, useRejectSubscriptionDelivery } from '@/hooks/useSubscriptions';
import { useSubscriptionMissedCounts } from '@/hooks/useSubscriptionDeliveryHistory';
import { useRemovePrimaryAgent } from '@/hooks/useAssignPrimaryAgent';
import { useTodaySubscriptionOrder } from '@/hooks/useSubscriptionOrders';
import { useSubscriptionDeliveryActions } from '@/hooks/useSubscriptionDeliveryActions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { AcceptanceDeadlineTimer } from '@/components/AcceptanceDeadlineTimer';
import { SubscriptionOrderCard } from '@/components/SubscriptionOrderCard';
import { TodayCompensationBanner } from '@/components/TodayCompensationBanner';

import { AssignAgentModal } from '@/components/AssignAgentModal';
import { CustomerDetailsDialog } from '@/components/CustomerDetailsDialog';
import { EditCustomerDialog } from '@/components/EditCustomerDialog';
import { VacationDatesSection } from '@/components/VacationDatesSection';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentISTTime, isAfter11_30PM_IST, getTomorrowDateIST, isDateTomorrow } from '@/utils/timeZone';
import { formatDateForDisplay, formatDateWithLabel } from '@/utils/subscriptionDateCalculator';
import { Search, RefreshCw, Calendar, User, Phone, MapPin, Package, CheckCircle, XCircle, Clock, CalendarClock, UserPlus, UserMinus, Eye, Pencil, Tag } from 'lucide-react';

const formatTimeSlot = (slot: string): string => {
  const map: Record<string, string> = {
    'morning-early': 'Early Morning',
    'morning': 'Morning',
    'morning-late': 'Late Morning',
    'evening-early': 'Early Evening',
    'evening': 'Evening',
    'evening-late': 'Late Evening',
  };
  return map[slot] || slot?.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'N/A';
};

const formatScheduleType = (type: string, deliveryDays?: string[] | null): string => {
  const map: Record<string, string> = {
    'everyday': 'Everyday',
    'alternative': 'Alternate Days',
    'weekend': 'Weekends',
  };
  if (type === 'custom' && deliveryDays?.length) {
    return `Custom (${deliveryDays.join(', ')})`;
  }
  return map[type] || type?.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'N/A';
};

const formatPlanDuration = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return 'N/A';
  const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24));
  if (days <= 7) return '1 Week Plan';
  if (days <= 14) return '2 Weeks Plan';
  if (days <= 31) return '1 Month Plan';
  if (days <= 93) return '3 Months Plan';
  if (days <= 186) return '6 Months Plan';
  if (days <= 366) return '1 Year Plan';
  return `${Math.round(days / 30)} Months Plan`;
};
import { format, addDays, parseISO, isSameDay, isWithinInterval, differenceInMinutes, setHours, setMinutes, setSeconds } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const Subscriptions = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<{ id: string; locationId: number | null } | null>(null);
  const [customerDetailsDialog, setCustomerDetailsDialog] = useState<{
    open: boolean;
    customerInfo: any;
    assignedAgent: any;
    subscriptionInfo: any;
  }>({
    open: false,
    customerInfo: null,
    assignedAgent: null,
    subscriptionInfo: null,
  });
  const [editCustomerDialog, setEditCustomerDialog] = useState<{
    open: boolean;
    customerId: string;
    customerInfo: any;
  }>({
    open: false,
    customerId: '',
    customerInfo: null,
  });

  const { data: subscriptions, isLoading, refetch } = useSellerSubscriptions();

  // Compute missed delivery counts
  const subscriptionIds = useMemo(() => (subscriptions || []).map(s => s.id), [subscriptions]);
  const { data: missedCounts } = useSubscriptionMissedCounts(subscriptionIds);
  const { acceptDelivery, skipDelivery, isProcessing } = useSubscriptionDeliveryActions();
  const { mutate: removePrimaryAgent, isPending: isRemovingAgent } = useRemovePrimaryAgent();

  // Set up real-time subscription for both subscriptions and customers tables
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('seller-subscriptions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        () => {
          // Refetch when customer data changes (e.g., name edited)
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  // Auto-refresh at midnight IST
  useEffect(() => {
    const interval = setInterval(() => {
      const now = getCurrentISTTime();
      const midnight = setHours(setMinutes(setSeconds(now, 0), 0), 0);
      
      // If we just passed midnight (within 1 minute)
      if (differenceInMinutes(now, midnight) <= 1 && differenceInMinutes(now, midnight) >= 0) {
        console.log('🌙 Midnight IST reached, refreshing subscriptions...');
        refetch();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [refetch]);

  // Calculate counts for all filter categories
  const subscriptionCounts = useMemo(() => {
    if (!subscriptions) return {
      total: 0,
      active: 0,
      inactive: 0,
      onVacation: 0,
      everyday: 0,
      weekend: 0,
      alternate: 0,
      agentAssigned: 0,
      agentNotAssigned: 0,
      hasMissed: 0,
    };

    let active = 0, inactive = 0, onVacation = 0;
    let everyday = 0, weekend = 0, alternate = 0;
    let agentAssigned = 0, agentNotAssigned = 0;
    let hasMissed = 0;

    subscriptions.forEach((sub) => {
      const activeVacation = sub.vacation?.find((v) => {
        if (v.status !== 'active') return false;
        const today = new Date();
        const start = parseISO(v.start_date);
        const end = parseISO(v.end_date);
        return isWithinInterval(today, { start, end });
      });
      const isOnVacationNow = !!activeVacation;

      if (isOnVacationNow) onVacation++;
      else if (sub.is_active) active++;
      else inactive++;

      if (sub.subscription_type === 'everyday') everyday++;
      else if (sub.subscription_type === 'weekend') weekend++;
      else if (sub.subscription_type === 'alternate') alternate++;

      if (sub.primary_agent_id) agentAssigned++;
      else agentNotAssigned++;

      if (missedCounts && missedCounts[sub.id] > 0) hasMissed++;
    });

    return {
      total: subscriptions.length,
      active,
      inactive,
      onVacation,
      everyday,
      weekend,
      alternate,
      agentAssigned,
      agentNotAssigned,
      hasMissed,
    };
  }, [subscriptions, missedCounts]);

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];

    return subscriptions.filter((sub) => {
      // Check vacation status
      const activeVacation = sub.vacation?.find((v) => {
        if (v.status !== 'active') return false;
        const today = new Date();
        const start = parseISO(v.start_date);
        const end = parseISO(v.end_date);
        return isWithinInterval(today, { start, end });
      });

      const isOnVacation = !!activeVacation;

      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        sub.customer_info?.full_name?.toLowerCase().includes(searchLower) ||
        sub.customer_info?.phone?.includes(searchTerm) ||
        sub.customer_info?.email?.toLowerCase().includes(searchLower) ||
        (sub.customer_id && sub.customer_id.includes(searchTerm)) ||
        (sub.user_id && sub.user_id.includes(searchTerm));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = sub.is_active && !isOnVacation;
      else if (statusFilter === 'inactive') matchesStatus = !sub.is_active;
      else if (statusFilter === 'on_vacation') matchesStatus = isOnVacation;
      else if (statusFilter === 'has_missed') matchesStatus = !!(missedCounts && missedCounts[sub.id] > 0);

      // Delivery type filter
      const matchesDeliveryType =
        deliveryTypeFilter === 'all' || sub.subscription_type === deliveryTypeFilter;

      // Agent assignment filter
      let matchesAgentFilter = true;
      if (agentFilter === 'assigned') matchesAgentFilter = !!sub.primary_agent_id;
      else if (agentFilter === 'not_assigned') matchesAgentFilter = !sub.primary_agent_id;

      return matchesSearch && matchesStatus && matchesDeliveryType && matchesAgentFilter;
    });
  }, [subscriptions, searchTerm, statusFilter, deliveryTypeFilter, agentFilter, missedCounts]);

  const shouldShowActions = (subscription: any) => {
    if (!subscription.is_active || !subscription.next_delivery_date) return false;

    // Check if on vacation
    const activeVacation = subscription.vacation?.find((v: any) => {
      if (v.status !== 'active') return false;
      const today = new Date();
      const start = parseISO(v.start_date);
      const end = parseISO(v.end_date);
      return isWithinInterval(today, { start, end });
    });

    if (activeVacation) return false;

    // NEW LOGIC: Check time-based conditions
    const isAfterCutoff = isAfter11_30PM_IST();
    const nextDelivery = parseISO(subscription.next_delivery_date);
    const tomorrow = getTomorrowDateIST();
    
    // Show actions only after 11:30 PM IST and only if next delivery is tomorrow
    if (isAfterCutoff) {
      return isSameDay(nextDelivery, tomorrow);
    }
    
    // Before 11:30 PM IST, don't show actions
    return false;
  };

  const getVacationInfo = (subscription: any) => {
    const activeVacation = subscription.vacation?.find((v: any) => {
      if (v.status !== 'active') return false;
      const today = new Date();
      const start = parseISO(v.start_date);
      const end = parseISO(v.end_date);
      return isWithinInterval(today, { start, end });
    });

    return activeVacation;
  };

  // Component to show today's delivery status
  const TodayDeliveryStatus = ({ subscription }: { subscription: any }) => {
    const today = format(getCurrentISTTime(), 'yyyy-MM-dd');
    const { data: todayOrder } = useTodaySubscriptionOrder(subscription.id);

    if (!todayOrder) {
      return null;
    }

    const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
      pending_seller_acceptance: { icon: Clock, color: 'text-yellow-500', label: 'Awaiting Acceptance' },
      accepted_by_seller: { icon: CheckCircle, color: 'text-green-500', label: 'Accepted' },
      accepted_late: { icon: CheckCircle, color: 'text-orange-500', label: 'Accepted (Late)' },
      skipped_by_seller: { icon: XCircle, color: 'text-gray-500', label: 'Skipped for Today' },
      pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
      accepted: { icon: CheckCircle, color: 'text-green-500', label: 'Accepted - Will be delivered' },
      assigned: { icon: CheckCircle, color: 'text-blue-500', label: 'Agent Assigned' },
      packed: { icon: CheckCircle, color: 'text-green-500', label: 'Packed & Ready' },
      not_accepted: { icon: XCircle, color: 'text-red-500', label: 'Not Accepted - Delivery Extended' },
      delivered: { icon: CheckCircle, color: 'text-green-500', label: 'Delivered' },
      cancelled: { icon: XCircle, color: 'text-red-500', label: 'Cancelled' }
    };

    const config = statusConfig[todayOrder.status] || statusConfig.pending;
    const Icon = config.icon;

    const needsAction = todayOrder.status === 'pending_seller_acceptance';

    return (
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className="text-sm font-medium">Today's Status:</span>
          </div>
          <Badge variant={
            needsAction ? 'secondary' : 
            todayOrder.status === 'skipped_by_seller' ? 'outline' :
            todayOrder.status === 'accepted_by_seller' || todayOrder.status === 'assigned' || todayOrder.status === 'packed' ? 'default' : 
            'destructive'
          }>
            {config.label}
          </Badge>
        </div>
        
        {/* Show auto-created order card */}
        <SubscriptionOrderCard 
          subscriptionId={subscription.id}
          deliveryDate={new Date(today)}
        />
        
        {needsAction && (
          <div className="mt-3 space-y-2">
            <AcceptanceDeadlineTimer deliveryDate={today} />
            <div className="flex gap-2">
              <Button
                onClick={() => acceptDelivery(todayOrder.id, subscription.id)}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Delivery
              </Button>
              <Button
                onClick={() => skipDelivery(todayOrder.id, subscription.id)}
                disabled={isProcessing}
                variant="outline"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Skip Delivery
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Today's Compensation Handovers Banner */}
      <TodayCompensationBanner />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground">Manage recurring customer deliveries</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 px-3 pb-2">
        <div className="flex gap-4 min-w-max items-end">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by customer name, phone, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status ({subscriptionCounts.total})</SelectItem>
            <SelectItem value="active">Active ({subscriptionCounts.active})</SelectItem>
            <SelectItem value="inactive">Inactive ({subscriptionCounts.inactive})</SelectItem>
            <SelectItem value="on_vacation">On Vacation ({subscriptionCounts.onVacation})</SelectItem>
            <SelectItem value="has_missed">Has Missed ({subscriptionCounts.hasMissed})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deliveryTypeFilter} onValueChange={setDeliveryTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types ({subscriptionCounts.total})</SelectItem>
            <SelectItem value="everyday">Everyday ({subscriptionCounts.everyday})</SelectItem>
            <SelectItem value="weekend">Weekend ({subscriptionCounts.weekend})</SelectItem>
            <SelectItem value="alternate">Alternate Days ({subscriptionCounts.alternate})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents ({subscriptionCounts.total})</SelectItem>
            <SelectItem value="assigned">Agent Assigned ({subscriptionCounts.agentAssigned})</SelectItem>
            <SelectItem value="not_assigned">Agent Not Assigned ({subscriptionCounts.agentNotAssigned})</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <CalendarClock className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Subscriptions Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' || deliveryTypeFilter !== 'all' || agentFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No subscriptions available yet'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSubscriptions.map((subscription) => {
            const vacationInfo = getVacationInfo(subscription);
            const showActions = shouldShowActions(subscription);

            return (
              <Card
                key={subscription.id}
                className="p-6 hover:shadow-lg transition-all duration-300 border-border"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold truncate">
                            {subscription.customer_info?.full_name || 'Unknown Customer'}
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs shrink-0"
                            onClick={() => setCustomerDetailsDialog({
                              open: true,
                              customerInfo: subscription.customer_info,
                              assignedAgent: (subscription as any).primary_agent || null,
                              subscriptionInfo: {
                                id: subscription.id,
                                customer_id: subscription.customer_id,
                                product_id: subscription.product_id,
                                product_name: subscription.products?.name,
                                quantity: subscription.quantity,
                              },
                            })}
                            title="View customer details"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs shrink-0"
                            onClick={() => setEditCustomerDialog({
                              open: true,
                              customerId: subscription.customer_id || '',
                              customerInfo: subscription.customer_info,
                            })}
                            title="Edit customer details"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {(subscription.customer_id || subscription.user_id || '').slice(0, 8)}...
                        </p>
                        {subscription.customer_info?.phone && (
                          <p className="text-sm text-muted-foreground">
                            📱 {subscription.customer_info.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 items-start w-full sm:w-auto">
                        <Badge
                          className={
                            subscription.is_active && !vacationInfo
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }
                        >
                          {subscription.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {vacationInfo && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                            🏖️ On Vacation
                          </Badge>
                        )}
                        {/* Primary Agent Status */}
                        <Badge
                          className={
                            subscription.primary_agent_id
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }
                        >
                          {subscription.primary_agent_id ? '✓ Agent Assigned' : '⚠ Agent Not Assigned'}
                        </Badge>
                        {/* Missed deliveries badge */}
                        {missedCounts && missedCounts[subscription.id] > 0 && (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                            {missedCounts[subscription.id]} Missed
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Agent Actions - separate row for mobile */}
                    <div className="flex flex-wrap gap-2">
                      {subscription.primary_agent_id ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSubscription({
                                id: subscription.id,
                                locationId: subscription.location_id
                              });
                              setAssignModalOpen(true);
                            }}
                            className="h-7 text-xs"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Change Agent
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isRemovingAgent}
                                className="h-7 text-xs"
                              >
                                <UserMinus className="h-3 w-3 mr-1" />
                                Remove Agent
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove assigned agent?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Use this if the delivery agent quit or can no longer deliver to this subscription. 
                                  The subscription will not be assigned to them anymore and you'll need to assign a new agent.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removePrimaryAgent(subscription.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirm Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSubscription({
                              id: subscription.id,
                              locationId: subscription.location_id
                            });
                            setAssignModalOpen(true);
                          }}
                          className="h-7 text-xs"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Assign Agent
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">
                              {(subscription.delivery_address as any)?.full_address || 'No address'}
                            </p>
                            {(subscription.delivery_address as any)?.city && (
                              <p className="text-muted-foreground">
                                {(subscription.delivery_address as any).city}
                                {(subscription.delivery_address as any).pincode &&
                                  ` - ${(subscription.delivery_address as any).pincode}`}
                              </p>
                            )}
                            {(subscription.delivery_address as any)?.landmark && (
                              <p className="text-muted-foreground text-xs">
                                Near: {(subscription.delivery_address as any).landmark}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {subscription.products?.name || 'Unknown Product'} (x
                            {subscription.quantity})
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3" />
                            {formatScheduleType(subscription.subscription_type, (subscription as any).delivery_days)}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {formatTimeSlot(subscription.delivery_time_slot)}
                          </Badge>
                          {subscription.start_date && subscription.end_date && (
                            <Badge variant="default" className="flex items-center gap-1 text-xs">
                              <Tag className="h-3 w-3" />
                              {formatPlanDuration(subscription.start_date, subscription.end_date)}
                            </Badge>
                          )}
                        </div>

                        {/* Location ID */}
                        {subscription.location_id && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>Location ID: {subscription.location_id}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Next Delivery: {formatDateWithLabel(subscription.next_delivery_date)}
                          </span>
                        </div>


                        <div className="text-muted-foreground">
                          Created: {format(parseISO(subscription.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>

                    {/* Vacation Dates Section with Compensation */}
                    {subscription.vacation && subscription.vacation.length > 0 && (
                      <VacationDatesSection
                        subscriptionId={subscription.id}
                        vacationPeriods={subscription.vacation}
                        locationId={subscription.location_id}
                      />
                    )}

                    {subscription.special_instructions && (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <p className="font-medium mb-1">Special Instructions:</p>
                        <p>{subscription.special_instructions}</p>
                      </div>
                    )}
                  </div>

                  {/* Show today's delivery status */}
                  <TodayDeliveryStatus subscription={subscription} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign Agent Modal */}
      <AssignAgentModal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedSubscription(null);
        }}
        subscriptionId={selectedSubscription?.id}
        locationId={selectedSubscription?.locationId ?? null}
        onAssigned={() => {
          refetch();
          setAssignModalOpen(false);
          setSelectedSubscription(null);
        }}
      />

      {/* Customer Details Dialog */}
      <CustomerDetailsDialog
        isOpen={customerDetailsDialog.open}
        onClose={() => setCustomerDetailsDialog({ open: false, customerInfo: null, assignedAgent: null, subscriptionInfo: null })}
        customerInfo={customerDetailsDialog.customerInfo}
        assignedAgent={customerDetailsDialog.assignedAgent}
        subscriptionInfo={customerDetailsDialog.subscriptionInfo}
      />

      {/* Edit Customer Dialog */}
      <EditCustomerDialog
        open={editCustomerDialog.open}
        onOpenChange={(open) => setEditCustomerDialog(prev => ({ ...prev, open }))}
        customerId={editCustomerDialog.customerId}
        customerInfo={editCustomerDialog.customerInfo}
        onSuccess={() => refetch()}
      />
    </motion.div>
  );
};

export default Subscriptions;
