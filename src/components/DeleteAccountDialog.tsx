import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { AlertTriangle, Loader2, XCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteAccountDialog = ({ open, onOpenChange }: DeleteAccountDialogProps) => {
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');
  const [understood, setUnderstood] = useState(false);
  const [reason, setReason] = useState('');
  const { isLoading, isChecking, blockers, checkDeletionEligibility, deleteAccount } = useDeleteAccount();

  useEffect(() => {
    if (open) {
      setStep('warning');
      setUnderstood(false);
      setReason('');
      checkDeletionEligibility();
    }
  }, [open]);

  const handleProceed = () => {
    if (blockers.length === 0) {
      setStep('confirm');
    }
  };

  const handleDelete = async () => {
    const success = await deleteAccount(reason);
    if (success) {
      onOpenChange(false);
    }
  };

  const hasBlockers = blockers.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        {step === 'warning' && (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-destructive/10">
                  <ShieldAlert className="h-6 w-6 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl text-destructive">
                  Delete Your Account
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  {isChecking ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Checking account status...</span>
                    </div>
                  ) : hasBlockers ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                          <div>
                            <p className="font-medium text-destructive">Cannot Delete Account</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Please resolve the following before deleting your account:
                            </p>
                          </div>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {blockers.map((blocker, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm p-3 rounded-lg bg-muted">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <span>{blocker.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Please read the following carefully before proceeding:
                      </p>
                      <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                        <ul className="space-y-3 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-destructive font-bold">•</span>
                            <span>All your account data will be <strong>deleted or anonymized</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-destructive font-bold">•</span>
                            <span>You will <strong>permanently lose access</strong> to your seller account</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-destructive font-bold">•</span>
                            <span>All your <strong>products will be removed</strong> from the marketplace</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-destructive font-bold">•</span>
                            <span>Order and payment records will be <strong>retained for legal compliance</strong> (180 days)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-destructive font-bold">•</span>
                            <span>Pending payouts will be <strong>settled before deletion</strong></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-destructive font-bold">•</span>
                            <span>This action is <strong>irreversible</strong></span>
                          </li>
                        </ul>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        By deleting your account, you agree to our{' '}
                        <Link to="/privacy-policy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                        {' '}regarding data retention.
                      </p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              {!hasBlockers && !isChecking && (
                <Button
                  variant="destructive"
                  onClick={handleProceed}
                  disabled={isLoading}
                >
                  Continue
                </Button>
              )}
            </AlertDialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-destructive/10">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl text-destructive">
                  Confirm Account Deletion
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    This is your final step. Your account will be permanently deleted.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-sm font-medium">
                      Reason for leaving (optional)
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="Help us improve by sharing why you're deleting your account..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted">
                    <Checkbox
                      id="understand"
                      checked={understood}
                      onCheckedChange={(checked) => setUnderstood(checked === true)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="understand"
                      className="text-sm font-medium leading-relaxed cursor-pointer"
                    >
                      I understand that deleting my account is permanent and all my data will be removed. This action cannot be undone.
                    </Label>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setStep('warning')}
                disabled={isLoading}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!understood || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete My Account
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
