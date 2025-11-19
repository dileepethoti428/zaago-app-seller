import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Clock, MapPin, Phone, User, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SubscriptionOrderCardProps {
  subscriptionId: string;
  deliveryDate: Date;
}

interface OrderData {
  id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  assigned_agent_id: string | null;
  delivery_agent?: {
    id: string;
    name: string;
    phone: string | null;
    profile_image: string | null;
  };
}

export const SubscriptionOrderCard = ({ subscriptionId, deliveryDate }: SubscriptionOrderCardProps) => {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const dateStr = format(deliveryDate, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            created_at,
            accepted_at,
            assigned_agent_id,
            delivery_agent:delivery_agents!orders_assigned_agent_id_fkey(
              id,
              name,
              phone,
              profile_image
            )
          `)
          .eq('subscription_id', subscriptionId)
          .eq('delivery_date', dateStr)
          .single();

        if (error) {
          console.error('Error fetching order:', error);
          setOrder(null);
        } else {
          setOrder(data as OrderData);
        }
      } catch (err) {
        console.error('Error:', err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`subscription-order-${subscriptionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `subscription_id=eq.${subscriptionId}`
        },
        (payload) => {
          console.log('Order updated:', payload);
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscriptionId, deliveryDate]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="h-4 w-4" />
          <p className="text-sm">No order created yet for this date</p>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending_seller_acceptance: { variant: 'secondary', label: 'Awaiting Acceptance' },
      accepted_by_seller: { variant: 'default', label: 'Accepted' },
      accepted_late: { variant: 'secondary', label: 'Accepted (Late)' },
      skipped_by_seller: { variant: 'outline', label: 'Skipped for Today' },
      pending: { variant: 'secondary', label: 'Pending' },
      accepted: { variant: 'default', label: 'Accepted' },
      assigned: { variant: 'default', label: 'Agent Assigned' },
      picked_up: { variant: 'default', label: 'Picked Up' },
      out_for_delivery: { variant: 'default', label: 'Out for Delivery' },
      delivered: { variant: 'default', label: 'Delivered' },
      not_accepted: { variant: 'destructive', label: 'Not Accepted' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Created: {format(new Date(order.created_at), 'h:mm a')}
            </p>
          </div>
          {order.accepted_at && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Accepted: {format(new Date(order.accepted_at), 'h:mm a')}
              </p>
            </div>
          )}
        </div>
        {getStatusBadge(order.status)}
      </div>

      {order.delivery_agent && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarImage src={order.delivery_agent.profile_image || undefined} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{order.delivery_agent.name}</p>
            {order.delivery_agent.phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{order.delivery_agent.phone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button
          onClick={() => navigate(`/order-detail/${order.id}`)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Track Order
        </Button>
      </div>
    </Card>
  );
};
