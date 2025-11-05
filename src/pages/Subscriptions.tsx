import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Search, RefreshCw, MapPin, Clock, Package, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddSubscriptionDialog } from '@/components/AddSubscriptionDialog';
import {
  useSellerSubscriptions,
  useAcceptSubscriptionDelivery,
  useRejectSubscriptionDelivery,
  useSubscriptionDeliveryStatus,
} from '@/hooks/useSubscriptions';
import { format, parseISO, isBefore, isAfter, isWithinInterval, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { isAfter11_30PM_IST, getTodayDateIST, getTomorrowDateIST } from '@/utils/timeZone';

const Subscriptions = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('all');

  const { data: subscriptions, isLoading, refetch } = useSellerSubscriptions();
  const acceptDelivery = useAcceptSubscriptionDelivery();
  const rejectDelivery = useRejectSubscriptionDelivery();

  // Set up real-time subscription
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

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
        sub.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        sub.profiles?.phone?.includes(searchTerm) ||
        sub.user_id.includes(searchTerm);

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = sub.is_active && !isOnVacation;
      else if (statusFilter === 'inactive') matchesStatus = !sub.is_active;
      else if (statusFilter === 'on_vacation') matchesStatus = isOnVacation;

      // Delivery type filter
      const matchesDeliveryType =
        deliveryTypeFilter === 'all' || sub.subscription_type === deliveryTypeFilter;

      return matchesSearch && matchesStatus && matchesDeliveryType;
    });
  }, [subscriptions, searchTerm, statusFilter, deliveryTypeFilter]);

  const handleAccept = async (subscriptionId: string) => {
    await acceptDelivery.mutateAsync(subscriptionId);
  };

  const handleReject = async (subscriptionId: string) => {
    await rejectDelivery.mutateAsync(subscriptionId);
  };

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
  const TodayDeliveryStatus = ({ subscriptionId, deliveryDate }: { subscriptionId: string; deliveryDate: string }) => {
    const { data: todayOrder, isLoading } = useSubscriptionDeliveryStatus(subscriptionId, deliveryDate);

    if (isLoading) {
      return (
        <div className="flex items-center text-sm text-muted-foreground lg:min-w-[160px]">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Checking status...
        </div>
      );
    }

    if (!todayOrder) {
      return (
        <div className="flex flex-col gap-2 lg:min-w-[160px]">
          <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            No delivery today
          </Badge>
          <p className="text-xs text-muted-foreground">
            Actions available after 11:30 PM
          </p>
        </div>
      );
    }

    const statusColors: Record<string, string> = {
      accepted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      placed: 'bg-green-500/20 text-green-400 border-green-500/30',
      delivered: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };

    return (
      <div className="flex flex-col gap-2 lg:min-w-[160px]">
        <Badge className={statusColors[todayOrder.status] || 'bg-gray-500/20 text-gray-400'}>
          Today: {todayOrder.status}
        </Badge>
        <p className="text-xs text-muted-foreground">
          Actions available after 11:30 PM
        </p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage recurring customer deliveries</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <AddSubscriptionDialog />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by customer name, phone, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_vacation">On Vacation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deliveryTypeFilter} onValueChange={setDeliveryTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="everyday">Everyday</SelectItem>
            <SelectItem value="weekend">Weekend</SelectItem>
            <SelectItem value="alternate">Alternate Days</SelectItem>
          </SelectContent>
        </Select>
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
              {searchTerm || statusFilter !== 'all' || deliveryTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first subscription'}
            </p>
            {!searchTerm && statusFilter === 'all' && deliveryTypeFilter === 'all' && (
              <AddSubscriptionDialog />
            )}
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
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {subscription.profiles?.full_name || 'Unknown Customer'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          ID: {subscription.user_id.slice(0, 8)}...
                        </p>
                        {subscription.profiles?.phone && (
                          <p className="text-sm text-muted-foreground">
                            📱 {subscription.profiles.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
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
                      </div>
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
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">
                            {subscription.subscription_type.replace('_', ' ')} •{' '}
                            {subscription.delivery_time_slot}
                          </span>
                        </div>

                        {subscription.next_delivery_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Next: {format(parseISO(subscription.next_delivery_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}

                        <div className="text-muted-foreground">
                          Created: {format(parseISO(subscription.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>

                    {vacationInfo && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <p className="text-sm text-orange-400">
                          🏖️ Vacation Period:{' '}
                          {format(parseISO(vacationInfo.start_date), 'MMM d')} -{' '}
                          {format(parseISO(vacationInfo.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}

                    {subscription.special_instructions && (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <p className="font-medium mb-1">Special Instructions:</p>
                        <p>{subscription.special_instructions}</p>
                      </div>
                    )}
                  </div>

                  {/* Show status before 11:30 PM IST */}
                  {!isAfter11_30PM_IST() && subscription.is_active && !vacationInfo && (
                    <TodayDeliveryStatus 
                      subscriptionId={subscription.id} 
                      deliveryDate={format(getTodayDateIST(), 'yyyy-MM-dd')}
                    />
                  )}

                  {/* Show action buttons after 11:30 PM IST */}
                  {showActions && (
                    <div className="flex flex-col gap-2 lg:min-w-[160px]">
                      <Button
                        onClick={() => handleAccept(subscription.id)}
                        disabled={acceptDelivery.isPending}
                        className="bg-zaago-green hover:bg-zaago-green/90 w-full"
                      >
                        Accept Delivery (Tomorrow)
                      </Button>
                      <Button
                        onClick={() => handleReject(subscription.id)}
                        disabled={rejectDelivery.isPending}
                        variant="outline"
                        className="w-full"
                      >
                        Skip Delivery (Tomorrow)
                      </Button>
                    </div>
                  )}

                  {!showActions && !isAfter11_30PM_IST() && subscription.is_active && vacationInfo && (
                    <div className="flex items-center text-sm text-muted-foreground lg:min-w-[160px]">
                      Actions disabled during vacation
                    </div>
                  )}

                  {isAfter11_30PM_IST() && !showActions && subscription.is_active && !vacationInfo && (
                    <div className="flex items-center text-sm text-muted-foreground lg:min-w-[160px]">
                      No delivery scheduled for tomorrow
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Subscriptions;
