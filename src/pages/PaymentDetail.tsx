import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';

interface PayoutDetail {
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
  updated_at: string;
}

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [payout, setPayout] = useState<PayoutDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      fetchPayoutDetail();
    }
  }, [user, id]);

  const fetchPayoutDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('id', id)
        .eq('seller_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: 'Payout Not Found',
            description: 'The requested payout could not be found.',
            variant: 'destructive',
          });
          navigate('/payments');
          return;
        }
        throw error;
      }

      setPayout(data);
    } catch (error) {
      console.error('Error fetching payout detail:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      paid: 'default',
      failed: 'destructive'
    };

    const colors: Record<string, string> = {
      pending: 'text-warning',
      processing: 'text-secondary',
      paid: 'text-primary',
      failed: 'text-destructive'
    };

    return (
      <Badge variant={variants[status] || 'outline'} className={`capitalize ${colors[status] || ''}`}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
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

  if (!payout) {
    return (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payout Not Found</h3>
              <p className="text-muted-foreground mb-6">
                The requested payout could not be found.
              </p>
              <Button onClick={() => navigate('/payments')}>
                Back to Payments
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/payments')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Payout Details
            </h1>
            <p className="text-muted-foreground">
              Payout ID: {getPayoutId(payout.id)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Breakdown
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of your payout calculation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Gross Amount</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(payout.amount)}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Commission ({payout.commission_rate}%)
                    </span>
                    <span className="text-lg font-semibold text-destructive">
                      -{formatCurrency(payout.commission_amount || (payout.amount * payout.commission_rate / 100))}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Net Amount</span>
                    <span className="text-3xl font-bold text-primary">
                      {formatCurrency(payout.net_amount || (payout.amount - (payout.commission_amount || (payout.amount * payout.commission_rate / 100))))}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    This payout covers sales from{' '}
                    <span className="font-semibold">{formatDateShort(payout.period_start)}</span>
                    {' '}to{' '}
                    <span className="font-semibold">{formatDateShort(payout.period_end)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {payout.payment_reference && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Reference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <code className="text-sm font-mono">
                      {payout.payment_reference}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use this reference to track your payment with your bank.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Status & Timeline */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Status & Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Status</span>
                  {getStatusBadge(payout.status)}
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium">Created</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(payout.created_at)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">Last Updated</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(payout.updated_at)}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Status Descriptions</div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div><span className="font-medium">Pending:</span> Awaiting processing</div>
                    <div><span className="font-medium">Processing:</span> Payment is being processed</div>
                    <div><span className="font-medium">Paid:</span> Payment completed successfully</div>
                    <div><span className="font-medium">Failed:</span> Payment failed, contact support</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {payout.status === 'failed' && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Payment Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This payment could not be processed. Please contact support for assistance.
                  </p>
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}