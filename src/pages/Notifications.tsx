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
  const [visibleCount, setVisibleCount] = useState(10);

  const notificationTypes = [
    { value: 'all', label: 'All Notifications' },
    { value: 'stock_alert', label: 'Stock Alerts' },
    { value: 'delivery', label: 'Delivery Updates' },
    { value: 'order_update', label: 'Order Updates' },
    { value: 'payment_confirmed', label: 'Payment Updates' },
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
      // Check if user is a seller by checking the sellers table
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isSeller = !!sellerData;
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id);
      
      // If user is a seller, only show seller-specific notifications
      if (isSeller) {
        query = query.eq('role', 'seller');
      } else {
        // For non-sellers (regular customers), exclude agent and seller-specific notifications
        query = query.in('role', ['user', 'customer']);
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
        .eq('id', notificationId as any);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-destructive text-destructive-foreground px-2 py-1 rounded text-sm font-medium">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Stay updated with your business activities
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 bg-card border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-w-[180px]"
          >
            {notificationTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            All Notifications ({filteredNotifications.length})
          </h2>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 flex items-start gap-4 hover:bg-muted/50 transition-colors ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <Bell className="w-5 h-5 text-muted-foreground mt-1" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">
                      {notification.title || 'System'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      notification.type === 'delivery' ? 'bg-green-100 text-green-800' :
                      notification.type === 'stock_alert' ? 'bg-orange-100 text-orange-800' :
                      notification.type === 'order' ? 'bg-blue-100 text-blue-800' :
                      notification.type === 'payment' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {notification.type === 'delivery' ? 'Delivery_success' :
                       notification.type === 'stock_alert' ? 'Assignment' :
                       notification.type === 'order' ? 'Order_update' :
                       notification.type === 'payment' ? 'Promotion' :
                       'General'}
                    </span>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-2">
                    {notification.message}
                  </p>
                  
                  <p className="text-muted-foreground text-xs">
                    {new Date(notification.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric'
                    })}, {new Date(notification.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <button
                  onClick={() => markAsRead(notification.id)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No notifications found
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || typeFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Your notifications will appear here'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;