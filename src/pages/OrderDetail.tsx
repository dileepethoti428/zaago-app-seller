import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  User,
  CheckSquare,
  XSquare,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      fetchOrderDetail();
      setupRealtimeSubscription();
    }
  }, [id, user]);

  const setupRealtimeSubscription = () => {
    if (!id) return;
    
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Order updated:', payload);
          setOrder(payload.new);
          
          toast({
            title: "Order Updated",
            description: "Order details have been updated",
            duration: 3000
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchOrderDetail = async () => {
    if (!id || !user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_agents (
            name,
            phone,
            email
          )
        `)
        .eq('id', id)
        .eq('seller_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching order:', error);
        toast({
          title: "Error",
          description: "Failed to fetch order details",
          variant: "destructive"
        });
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order || processingAction) return;
    
    setProcessingAction(newStatus);
    
    try {
      // Optimistic update
      setOrder(prev => ({ ...prev, status: newStatus }));

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id)
        .eq('seller_id', user?.id);

      if (error) {
        throw error;
      }

      const statusMessages = {
        accepted: 'Order has been accepted successfully',
        rejected: 'Order has been rejected',
        in_transit: 'Order marked as in transit',
        delivered: 'Order marked as delivered'
      };

      toast({
        title: "Order Updated",
        description: statusMessages[newStatus as keyof typeof statusMessages] || 'Order status updated',
        variant: newStatus === 'rejected' ? 'destructive' : 'default'
      });
    } catch (error) {
      console.error('Error updating order:', error);
      
      // Revert optimistic update
      await fetchOrderDetail();
      
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case 'new':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'accepted':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'rejected':
        return <XSquare className="w-5 h-5 text-red-500" />;
      case 'assigned':
      case 'out_for_delivery':
      case 'in_transit':
        return <Truck className="w-5 h-5 text-purple-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-secondary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { label: 'New', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      accepted: { label: 'Accepted', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      assigned: { label: 'Assigned', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      out_for_delivery: { label: 'Out for Delivery', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      in_transit: { label: 'In Transit', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      delivered: { label: 'Delivered', className: 'bg-primary/20 text-primary border-primary/30' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, className: '' };

    return (
      <Badge className={`capitalize shadow-glow ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-secondary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Order not found
        </h3>
        <p className="text-secondary text-sm mb-4">
          The order you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button asChild>
          <Link to="/orders">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/orders">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Order #{order.id.toString().slice(0, 8)}
            </h1>
            <p className="text-secondary text-sm sm:text-base">
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <Button onClick={fetchOrderDetail} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status & Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Status Card */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(order.status)}
                  <span>Order Status</span>
                </div>
                {getStatusBadge(order.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-secondary">Payment Status</p>
                    <p className="text-foreground font-medium capitalize">
                      {order.payment_status || 'Pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-secondary">Delivery Date</p>
                    <p className="text-foreground font-medium">
                      {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Not scheduled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-secondary">Total Amount</p>
                    <p className="text-foreground font-medium text-lg">
                      ₹{order.total}
                    </p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <Separator />
                <div className="flex flex-wrap gap-3">
                  {order.status === 'new' && (
                    <>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={!!processingAction}
                            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            Accept Order
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Accept this order?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You are about to accept this order. The customer will be notified and you'll be responsible for fulfilling it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => updateOrderStatus('accepted')}>
                              Accept Order
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={!!processingAction}
                            variant="outline"
                            className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                          >
                            <XSquare className="w-4 h-4 mr-2" />
                            Reject Order
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject this order?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You are about to reject this order. The customer will be notified and this action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => updateOrderStatus('rejected')}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Reject Order
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  
                  {order.status === 'accepted' && (
                    <Button
                      onClick={() => updateOrderStatus('in_transit')}
                      disabled={!!processingAction}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Mark In Transit
                    </Button>
                  )}
                  
                  {order.status === 'in_transit' && (
                    <Button
                      onClick={() => updateOrderStatus('delivered')}
                      disabled={!!processingAction}
                      className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Delivered
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items && Array.isArray(order.items) ? order.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-xl">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{item.name}</h4>
                      <p className="text-secondary text-sm">
                        Quantity: {item.quantity} × ₹{item.price}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">
                      ₹{(item.quantity * item.price).toFixed(2)}
                    </p>
                  </div>
                )) : (
                  <p className="text-secondary text-center py-4">No items found</p>
                )}
                
                <Separator />
                
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total:</span>
                  <span>₹{order.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Customer & Delivery Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="space-y-6"
        >
          {/* Customer Info */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-secondary text-sm">Name</p>
                <p className="text-foreground font-medium">
                  {order.customer_name || 'N/A'}
                </p>
              </div>
              {order.customer_phone && (
                <div>
                  <p className="text-secondary text-sm">Phone</p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-secondary" />
                    <p className="text-foreground font-medium">
                      {order.customer_phone}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card className="zaago-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.address ? (
                <div className="space-y-2">
                  <p className="text-foreground">
                    {order.address.full_address || order.address.label || 'Address not provided'}
                  </p>
                  {order.address.city && (
                    <p className="text-secondary text-sm">
                      {order.address.city}, {order.address.state} - {order.address.pincode}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-secondary">No address provided</p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Agent */}
          {order.delivery_agents && (
            <Card className="zaago-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Delivery Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-secondary text-sm">Agent Name</p>
                  <p className="text-foreground font-medium">
                    {order.delivery_agents.name}
                  </p>
                </div>
                {order.delivery_agents.phone && (
                  <div>
                    <p className="text-secondary text-sm">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-secondary" />
                      <p className="text-foreground font-medium">
                        {order.delivery_agents.phone}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Special Instructions */}
          {order.special_instructions && (
            <Card className="zaago-card">
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{order.special_instructions}</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OrderDetail;