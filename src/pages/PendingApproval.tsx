import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle, Mail } from 'lucide-react';

export default function PendingApproval() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-xl">Application Under Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Thank you for registering as a seller! Your application is currently under review by our admin team.
          </p>
          
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Application submitted successfully</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-warning" />
              <span>Waiting for admin approval</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>You'll receive an email notification once approved</span>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <p className="font-medium mb-2">What happens next?</p>
            <ul className="text-left space-y-1 text-muted-foreground">
              <li>• Admin will review your application</li>
              <li>• You'll receive an email notification</li>
              <li>• Once approved, you can start adding products</li>
            </ul>
          </div>

          <Button variant="outline" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}