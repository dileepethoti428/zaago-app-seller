import { LogOut, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function AccountDeactivated() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Account Deactivated</h1>
        <p className="text-muted-foreground">
          Your seller account has been deactivated by the administrator. 
          You cannot access the app until your account is reactivated.
        </p>
        <p className="text-sm text-muted-foreground">
          Please contact admin for reactivation.
        </p>
        <Button
          onClick={() => signOut()}
          variant="outline"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
