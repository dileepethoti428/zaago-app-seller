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
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const OrderDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchOrderDetail();
    }
  }, [id, user]);

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
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching order:', error);
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case 'placed':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'confirmed':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'assigned':
      case 'out_for_delivery':
        return <Truck className="w-5 h-5 text-purple-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-secondary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      placed: { label: 'New', variant: 'secondary' as const },
      confirmed: { label: 'Confirmed', variant: 'default' as const },
      assigned: { label: 'Assigned', variant: 'outline' as const },
      out_for_delivery: { label: 'Out for Delivery', variant: 'outline' as const },
      delivered: { label: 'Delivered', variant: 'default' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'secondary' as const };

    return (
      <Badge variant={config.variant} className="capitalize">
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
        className="flex items-center gap-4"
      >
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