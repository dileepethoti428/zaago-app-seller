import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  Bell, 
  Package, 
  Truck, 
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  Filter,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const notificationTypes = [
    { value: 'all', label: 'All Notifications' },
    { value: 'delivery', label: 'Product Delivered' },
    { value: 'stock_alert', label: 'Stock Alerts' },
    { value: 'order', label: 'Order Updates' },
    { value: 'payment', label: 'Payment Updates' },
    { value: 'system', label: 'System Notifications' }
  ];

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, typeFilter]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Check if user is a seller and filter notifications accordingly
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const isSeller = userRoles?.some(role => role.role === 'seller');
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id);
      
      // If user is a seller, only show seller-relevant notifications
      if (isSeller) {
        query = query.in('type', ['delivery', 'stock_alert']);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(notification => 
        notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'delivery':
        return <Truck className="w-5 h-5 text-green-500" />;
      case 'stock_alert':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-primary" />;
      case 'system':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-secondary" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    const typeConfig = {
      order: { label: 'Order', variant: 'default' as const },
      delivery: { label: 'Delivered', variant: 'default' as const },
      stock_alert: { label: 'Stock Alert', variant: 'destructive' as const },
      payment: { label: 'Payment', variant: 'secondary' as const },
      system: { label: 'System', variant: 'outline' as const }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || 
                  { label: type, variant: 'secondary' as const };

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-3">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-secondary text-sm sm:text-base">
            Stay updated with your business activities
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <Card className="zaago-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 min-w-[200px]">
                <Filter className="w-4 h-4 text-secondary" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Card className="zaago-card">
          <CardHeader>
            <CardTitle>All Notifications ({filteredNotifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`border border-border rounded-xl p-4 transition-colors ${
                      !notification.is_read 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {notification.title}
                            </h3>
                            {getNotificationBadge(notification.type)}
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full shrink-0"></div>
                            )}
                          </div>
                          <p className="text-secondary text-sm mb-2">
                            {notification.message}
                          </p>
                          <p className="text-secondary text-xs">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <Button
                            onClick={() => markAsRead(notification.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No notifications found
                </h3>
                <p className="text-secondary text-sm">
                  {searchTerm || typeFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Your notifications will appear here'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Notifications;