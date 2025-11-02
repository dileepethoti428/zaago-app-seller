import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Smartphone } from 'lucide-react';

export const TestLockScreenNotification = () => {
  const [loading, setLoading] = useState(false);

  const testNewOrderNotification = async () => {
    setLoading(true);
    try {
      // Get a recent order to use for testing
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const orderId = orders?.[0]?.id || 'test-order-id';

      const { data, error: functionError } = await supabase.functions.invoke(
        'sendLiveOrderNotification',
        { body: { orderId } }
      );

      if (functionError) throw functionError;

      toast.success('Test notification sent!', {
        description: 'Check your lock screen on your mobile device',
      });

      console.log('Test notification response:', data);
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const testOrderUpdateNotification = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get a recent order
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const orderId = orders?.[0]?.id || 'test-order-id';

      const { data, error: functionError } = await supabase.functions.invoke(
        'send-order-notification',
        {
          body: {
            orderId,
            status: 'packed',
            userId: user.id,
          },
        }
      );

      if (functionError) throw functionError;

      toast.success('Test order update notification sent!', {
        description: 'Check your lock screen on your mobile device',
      });

      console.log('Test notification response:', data);
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Lock Screen Notification Test
        </CardTitle>
        <CardDescription>
          Test high-priority lock screen notifications on your mobile device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Button
            onClick={testNewOrderNotification}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            <Bell className="mr-2 h-4 w-4" />
            Test New Order Notification
          </Button>
          <p className="text-xs text-muted-foreground">
            Sends a high-priority new order notification to lock screen
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={testOrderUpdateNotification}
            disabled={loading}
            className="w-full"
            variant="secondary"
          >
            <Bell className="mr-2 h-4 w-4" />
            Test Order Update Notification
          </Button>
          <p className="text-xs text-muted-foreground">
            Sends a high-priority order update notification to lock screen
          </p>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-md text-xs space-y-1">
          <p className="font-semibold">Testing Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Grant notification permission if not already done</li>
            <li>Lock your phone screen</li>
            <li>Click one of the test buttons above</li>
            <li>Wait 2-3 seconds to see the notification on lock screen</li>
          </ol>
          <p className="mt-2 text-muted-foreground">
            <strong>Note:</strong> For iOS, install as PWA (Add to Home Screen) first
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
