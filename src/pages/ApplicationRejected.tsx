import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { XCircle, Mail, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ApplicationRejected() {
  const { user, signOut } = useAuth();
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchRejectionReason();
    }
  }, [user]);

  const fetchRejectionReason = async () => {
    try {
      const { data } = await supabase
        .from('sellers')
        .select('rejection_reason')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (data?.rejection_reason) {
        setRejectionReason(data.rejection_reason);
      }
    } catch (error) {
      console.error('Error fetching rejection reason:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Application Rejected</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Unfortunately, your seller application has been rejected by our admin team.
          </p>
          
          {rejectionReason && (
            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-destructive text-sm mb-1">Rejection Reason:</p>
                  <p className="text-sm text-muted-foreground">{rejectionReason}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" />
              <p className="font-medium">Need Help?</p>
            </div>
            <p className="text-left text-muted-foreground">
              If you believe this rejection was made in error or if you have questions, 
              please contact our support team for assistance.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={signOut} className="flex-1">
              Sign Out
            </Button>
            <Button 
              variant="default" 
              onClick={() => window.location.href = 'mailto:support@zaago.com'}
              className="flex-1"
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}