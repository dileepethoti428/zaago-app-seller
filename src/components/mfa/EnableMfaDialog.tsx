import { useState } from "react";
import { Loader2, Lock, ShieldCheck, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  useEnrollMfa,
  useVerifyEnrollment,
  useGenerateRecoveryCodes,
  reauthenticatePassword,
} from "@/hooks/useMfa";
import { useToast } from "@/hooks/use-toast";
import { RecoveryCodesDialog } from "./RecoveryCodesDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onEnabled: () => void;
}

type Step = "password" | "qr" | "verify" | "codes";

export function EnableMfaDialog({ open, onClose, onEnabled }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [factor, setFactor] = useState<any>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const enroll = useEnrollMfa();
  const verify = useVerifyEnrollment();
  const genCodes = useGenerateRecoveryCodes();

  const reset = () => {
    setStep("password");
    setPassword("");
    setOtp("");
    setFactor(null);
    setCodes([]);
    setBusy(false);
  };

  const close = () => { reset(); onClose(); };

  const handlePassword = async () => {
    if (!password) return;
    setBusy(true);
    try {
      await reauthenticatePassword(password);
      const f = await enroll.mutateAsync();
      setFactor(f);
      setStep("qr");
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6 || !factor) return;
    setBusy(true);
    try {
      await verify.mutateAsync({ factorId: factor.id, code: otp });
      const c = await genCodes.mutateAsync();
      setCodes(c);
      setStep("codes");
      setShowCodes(true);
    } catch (e: any) {
      toast({ title: "Invalid code", description: "Check your authenticator app and try again.", variant: "destructive" });
      setOtp("");
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!factor?.totp?.secret) return;
    await navigator.clipboard.writeText(factor.totp.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <>
      <Dialog open={open && !showCodes} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-zaago-green" />
              Enable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              {step === "password" && "Confirm your password to continue."}
              {step === "qr" && "Scan the QR code with your authenticator app."}
              {step === "verify" && "Enter the 6-digit code from your app."}
            </DialogDescription>
          </DialogHeader>

          {step === "password" && (
            <div className="space-y-4">
              <div>
                <Label>Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    autoFocus
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePassword()}
                  />
                </div>
              </div>
              <Button onClick={handlePassword} disabled={busy || !password} className="w-full bg-zaago-green hover:bg-zaago-green/90">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          )}

          {step === "qr" && factor && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={factor.totp.qr_code} alt="MFA QR code" className="w-48 h-48" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Or enter this key manually</Label>
                <div className="flex items-center gap-2 mt-1 p-2 bg-muted/40 rounded font-mono text-xs break-all">
                  <span className="flex-1">{factor.totp.secret}</span>
                  <Button size="icon" variant="ghost" onClick={copySecret} className="h-7 w-7 flex-shrink-0">
                    {copiedSecret ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use Google Authenticator, Microsoft Authenticator, Authy, or 2FAS.
              </p>
              <Button onClick={() => setStep("verify")} className="w-full bg-zaago-green hover:bg-zaago-green/90">
                Next
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleVerify}
                disabled={busy || otp.length !== 6}
                className="w-full bg-zaago-green hover:bg-zaago-green/90"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Enable"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RecoveryCodesDialog
        open={showCodes}
        codes={codes}
        onClose={() => {
          setShowCodes(false);
          onEnabled();
          close();
        }}
      />
    </>
  );
}
