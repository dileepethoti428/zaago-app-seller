import { useState } from "react";
import { Loader2, ShieldOff, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  reauthenticatePassword,
  verifyMfaCode,
  useUnenrollMfa,
  checkMfaLockout,
  recordMfaAttempt,
} from "@/hooks/useMfa";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  factorId: string;
  onDisabled: () => void;
}

export function DisableMfaDialog({ open, onClose, factorId, onDisabled }: Props) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const unenroll = useUnenrollMfa();

  const close = () => {
    setPassword(""); setCode(""); setBusy(false); onClose();
  };

  const handleDisable = async () => {
    if (!password || code.length !== 6) return;
    setBusy(true);
    try {
      const lock = await checkMfaLockout("disable");
      if (lock.locked) {
        toast({
          title: "Too many attempts",
          description: `Try again in ${lock.secondsRemaining}s.`,
          variant: "destructive",
        });
        setBusy(false);
        return;
      }

      await reauthenticatePassword(password);
      try {
        await verifyMfaCode(factorId, code);
        await recordMfaAttempt("disable", true);
      } catch (e) {
        await recordMfaAttempt("disable", false);
        throw new Error("Invalid authentication code");
      }
      await unenroll.mutateAsync(factorId);
      toast({ title: "Two-Factor Authentication disabled" });
      onDisabled();
      close();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-destructive" />
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Confirm your password and current authenticator code to turn off 2FA. Your recovery codes will be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Authenticator code</Label>
            <div className="flex justify-center mt-2">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            disabled={busy || !password || code.length !== 6}
            onClick={handleDisable}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
