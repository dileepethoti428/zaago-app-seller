import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Payout {
  id: string;
  amount: number;
  commission_rate: number;
  commission_amount?: number;
  net_amount?: number;
  period_start: string;
  period_end: string;
  status: string;
  payment_reference?: string;
  razorpay_payout_id?: string;
  transaction_id?: string;
  failure_reason?: string;
  created_at: string;
}

interface CommissionConfig {
  commission_rate: number;
}

interface PaymentStats {
  totalEarnings: number;
  pendingPayout: number;
  lastPayoutDate: string | null;
}

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [stats, setStats] = useState<PaymentStats>({
    totalEarnings: 0,
    pendingPayout: 0,
    lastPayoutDate: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPayouts();
      fetchCommissionRate();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayouts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payouts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionRate = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_config')
        .select('commission_rate')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setCommissionRate(data?.commission_rate || 10);
    } catch (error) {
      console.error('Error fetching commission rate:', error);
    }
  };

  const calculateStats = (payoutData: Payout[]) => {
    const totalEarnings = payoutData
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

    const pendingPayout = payoutData
      .filter(p => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + (p.net_amount || p.amount), 0);

    const lastPaidPayout = payoutData
      .filter(p => p.status === 'paid')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    setStats({
      totalEarnings,
      pendingPayout,
      lastPayoutDate: lastPaidPayout?.created_at || null
    });
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('payouts-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payouts',
          filter: `seller_id=eq.${user?.id}`
        },
        (payload) => {
        const updatedPayout = payload.new as Payout;
        
        if (updatedPayout.status === 'paid') {
          const amount = updatedPayout.net_amount || updatedPayout.amount;
          toast({
            title: 'Payment Released!',
            description: `Your payout of ₹${amount.toFixed(2)} has been processed.`,
            duration: 5000,
          });
        }
          
          fetchPayouts(); // Refresh data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      paid: 'default',
      failed: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getPayoutId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments Dashboard</h1>
            <p className="text-muted-foreground">
              Current commission rate: <span className="font-semibold">{commissionRate}%</span>
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats.totalEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">
                From completed payouts
              </p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {formatCurrency(stats.pendingPayout)}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Payout</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.lastPayoutDate ? formatDate(stats.lastPayoutDate) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent payment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payouts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              View all your payouts and commission details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payouts yet</h3>
                <p className="text-muted-foreground">
                  Your payouts will appear here once you start receiving payments.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payout ID</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Gross Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono">
                          {getPayoutId(payout.id)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(payout.period_start)}</div>
                            <div className="text-muted-foreground">
                              to {formatDate(payout.period_end)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payout.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{payout.commission_rate}%</div>
                            <div className="text-muted-foreground">
                              -{formatCurrency(payout.commission_amount || (payout.amount * payout.commission_rate / 100))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(payout.net_amount || (payout.amount - (payout.commission_amount || (payout.amount * payout.commission_rate / 100))))}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payout.status)}
                        </TableCell>
                        <TableCell>
                          {formatDate(payout.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/payments/${payout.id}`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}