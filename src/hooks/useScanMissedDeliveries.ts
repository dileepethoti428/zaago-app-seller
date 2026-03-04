import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface ScanResult {
  success: boolean;
  date_range: string;
  orders_found: number;
  daily_orders_found: number;
  stale_pending_found: number;
  compensations_created: number;
  errors?: string[];
}

function getISTDateString(date: Date): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

interface DailyOrderRow {
  id: string;
  status: string;
  subscription_id: string;
  customer_id: string;
  date: string;
  quantity: number;
}

async function processDailyOrder(
  dailyOrder: DailyOrderRow,
  sellerIdFilter: string,
  errors: string[]
): Promise<boolean> {
  try {
    // Check if compensation already exists by daily_order_id
    const { data: existingComp } = await supabase
      .from('vacation_compensations')
      .select('id')
      .eq('daily_order_id', dailyOrder.id)
      .maybeSingle();

    if (existingComp) return false;

    // Also check by subscription_id + date
    const { data: existingByDate } = await supabase
      .from('vacation_compensations')
      .select('id')
      .eq('subscription_id', dailyOrder.subscription_id)
      .eq('original_vacation_date', dailyOrder.date)
      .maybeSingle();

    if (existingByDate) return false;

    // Get subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('product_id')
      .eq('id', dailyOrder.subscription_id)
      .single();

    if (!subscription) return false;

    // Get product and seller
    const { data: product } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', subscription.product_id)
      .single();

    if (!product) return false;

    // Apply seller filter
    if (product.seller_id !== sellerIdFilter) return false;

    // Check for vacation period
    const { data: vacationPeriod } = await supabase
      .from('subscription_vacation_periods')
      .select('id')
      .eq('subscription_id', dailyOrder.subscription_id)
      .eq('status', 'active')
      .lte('start_date', dailyOrder.date)
      .gte('end_date', dailyOrder.date)
      .maybeSingle();

    let reason: string;
    if (vacationPeriod) {
      reason = 'vacation';
    } else if (dailyOrder.status === 'cancelled_agent') {
      reason = 'agent_issue';
    } else {
      reason = 'delivery_failed';
    }

    const { error: insertError } = await supabase
      .from('vacation_compensations')
      .insert({
        subscription_id: dailyOrder.subscription_id,
        vacation_period_id: vacationPeriod?.id || null,
        daily_order_id: dailyOrder.id,
        customer_id: dailyOrder.customer_id,
        product_id: subscription.product_id,
        seller_id: product.seller_id,
        original_vacation_date: dailyOrder.date,
        quantity: dailyOrder.quantity,
        reason: reason,
        compensation_type: 'extra_delivery',
        status: 'pending',
        delivery_failed_at: new Date().toISOString(),
      });

    if (insertError) {
      if (insertError.code !== '23505') {
        errors.push(`Daily order ${dailyOrder.id}: ${insertError.message}`);
      }
      return false;
    }

    return true;
  } catch (e) {
    errors.push(`Daily order ${dailyOrder.id}: ${String(e)}`);
    return false;
  }
}

export const useScanMissedDeliveries = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const scan = async (daysBack = 30) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to scan for missed deliveries',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const sellerId = user.id;
      const now = new Date();
      const todayIST = getISTDateString(now);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateIST = getISTDateString(startDate);

      let compensationsCreated = 0;
      let ordersMissed = 0;
      let dailyOrdersMissed = 0;
      let stalePendingFound = 0;
      const errors: string[] = [];

      // 1. Scan regular orders with failed status
      const failedStatuses = ['delivery_failed', 'undelivered', 'technical_error', 'agent_unavailable', 'not_delivered'];

      const { data: missedOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, seller_id, subscription_id, items, delivery_date, created_at')
        .in('status', failedStatuses)
        .eq('seller_id', sellerId)
        .gte('created_at', `${startDateIST}T00:00:00`)
        .lt('created_at', `${todayIST}T00:00:00`);

      if (ordersError) {
        errors.push(`Orders fetch error: ${ordersError.message}`);
      } else {
        ordersMissed = missedOrders?.length || 0;

        for (const order of missedOrders || []) {
          try {
            const { data: existingComp } = await supabase
              .from('vacation_compensations')
              .select('id')
              .eq('order_id', order.id)
              .maybeSingle();

            if (existingComp) continue;

            let productId: string | null = null;
            let quantity = 1;

            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
              const firstItem = order.items[0] as any;
              productId = firstItem.product_id || firstItem.id || null;
              quantity = firstItem.quantity || 1;
            }

            if (!order.subscription_id) continue;

            const { data: subscription } = await supabase
              .from('subscriptions')
              .select('customer_id')
              .eq('id', order.subscription_id)
              .single();

            const deliveryDate = order.delivery_date || order.created_at.split('T')[0];

            const { data: vacationPeriod } = await supabase
              .from('subscription_vacation_periods')
              .select('id')
              .eq('subscription_id', order.subscription_id)
              .eq('status', 'active')
              .lte('start_date', deliveryDate)
              .gte('end_date', deliveryDate)
              .maybeSingle();

            let vacationPeriodId: string | null = null;
            let reason = 'delivery_failed';

            if (vacationPeriod) {
              vacationPeriodId = vacationPeriod.id;
              reason = 'vacation';
            } else {
              reason = order.status === 'technical_error' ? 'technical_error' :
                       (order.status === 'agent_unavailable' || order.status === 'not_delivered') ? 'agent_issue' :
                       'delivery_failed';
            }

            const { error: insertError } = await supabase
              .from('vacation_compensations')
              .insert({
                subscription_id: order.subscription_id,
                vacation_period_id: vacationPeriodId,
                order_id: order.id,
                customer_id: subscription?.customer_id || null,
                product_id: productId,
                seller_id: sellerId,
                original_vacation_date: deliveryDate,
                quantity: quantity,
                reason: reason,
                compensation_type: 'extra_delivery',
                status: 'pending',
                delivery_failed_at: new Date().toISOString(),
              });

            if (insertError) {
              if (insertError.code !== '23505') {
                errors.push(`Order ${order.id}: ${insertError.message}`);
              }
            } else {
              compensationsCreated++;
            }
          } catch (e) {
            errors.push(`Order ${order.id}: ${String(e)}`);
          }
        }
      }

      // 2. Scan daily_orders with explicit failure statuses
      const dailyFailedStatuses = ['failed', 'undelivered', 'cancelled_agent', 'not_delivered', 'delivery_failed'];

      const { data: missedDailyOrders, error: dailyError } = await supabase
        .from('daily_orders')
        .select('id, status, subscription_id, customer_id, date, quantity')
        .in('status', dailyFailedStatuses)
        .gte('date', startDateIST)
        .lt('date', todayIST);

      if (dailyError) {
        errors.push(`Daily orders fetch error: ${dailyError.message}`);
      } else {
        dailyOrdersMissed = missedDailyOrders?.length || 0;

        for (const dailyOrder of (missedDailyOrders || []) as DailyOrderRow[]) {
          const created = await processDailyOrder(dailyOrder, sellerId, errors);
          if (created) compensationsCreated++;
        }
      }

      // 3. Scan stale PENDING daily_orders (past-due, never delivered)
      const { data: stalePendingOrders, error: staleError } = await supabase
        .from('daily_orders')
        .select('id, status, subscription_id, customer_id, date, quantity')
        .eq('status', 'pending')
        .gte('date', startDateIST)
        .lt('date', todayIST);

      if (staleError) {
        errors.push(`Stale pending fetch error: ${staleError.message}`);
      } else {
        stalePendingFound = stalePendingOrders?.length || 0;

        for (const dailyOrder of (stalePendingOrders || []) as DailyOrderRow[]) {
          const created = await processDailyOrder(dailyOrder, sellerId, errors);
          if (created) compensationsCreated++;
        }
      }

      const result: ScanResult = {
        success: true,
        date_range: `${startDateIST} to ${todayIST}`,
        orders_found: ordersMissed,
        daily_orders_found: dailyOrdersMissed,
        stale_pending_found: stalePendingFound,
        compensations_created: compensationsCreated,
        errors: errors.length > 0 ? errors : undefined,
      };

      setScanResult(result);

      queryClient.invalidateQueries({ queryKey: ['all-vacation-data'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-compensations'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-dates-status'] });

      const totalFound = result.orders_found + result.daily_orders_found + result.stale_pending_found;

      toast({
        title: 'Scan Complete',
        description: `Found ${totalFound} undelivered orders. Created ${result.compensations_created} new compensations.`,
      });
    } catch (err: any) {
      console.error('Scan error:', err);
      toast({
        title: 'Scan Failed',
        description: err.message || 'Failed to scan for missed deliveries',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return {
    scan,
    isScanning,
    scanResult,
    clearResult: () => setScanResult(null),
  };
};
