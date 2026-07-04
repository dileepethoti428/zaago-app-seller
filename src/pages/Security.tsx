import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ShieldOff, KeyRound, ArrowLeft, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMfaStatus,
  useGenerateRecoveryCodes,
  reauthenticatePassword,
  verifyMfaCode,
} from "@/hooks/useMfa";
import { EnableMfaDialog } from "@/components/mfa/EnableMfaDialog";
import { DisableMfaDialog } from "@/components/mfa/DisableMfaDialog";
import { RecoveryCodesDialog } from "@/components/mfa/RecoveryCodesDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

export default function Security() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: status, isLoading, refetch } = useMfaStatus();
  const [showEnable, setShowEnable] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [regenPwd, setRegenPwd] = useState("");
  const [regenCode, setRegenCode] = useState("");
  const [regenBusy, setRegenBusy] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const gen = useGenerateRecoveryCodes();

  const handleRegenerate = async () => {
    if (!status?.factorId || !regenPwd || regenCode.length !== 6) return;
    setRegenBusy(true);
    try {
      await reauthenticatePassword(regenPwd);
      await verifyMfaCode(status.factorId, regenCode);
      const codes = await gen.mutateAsync();
      setNewCodes(codes);
      setShowRegen(false);
      setRegenPwd(""); setRegenCode("");
      toast({ title: "New recovery codes generated", description: "Old codes are no longer valid." });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || "Invalid password or code", variant: "destructive" });
    } finally {
      setRegenBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto p-4 md:p-6 space-y-4"
    >
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground">Protect your account with extra sign-in verification.</p>
      </div>

      {/* 2FA card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="zaago-card p-6"
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            status?.enabled ? "bg-zaago-green/10" : "bg-muted"
          }`}>
            {status?.enabled ? (
              <ShieldCheck className="w-6 h-6 text-zaago-green" />
            ) : (
              <ShieldOff className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h2>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : status?.enabled ? (
                <Badge className="bg-zaago-green/15 text-zaago-green border-zaago-green/30 hover:bg-zaago-green/20">Enabled</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Require a code from your authenticator app when signing in.
            </p>
            {status?.enabled && status.factorCreatedAt && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-zaago-green" />
                Enabled on {new Date(status.factorCreatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : status?.enabled ? (
            <Button
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setShowDisable(true)}
            >
              Disable Two-Factor Authentication
            </Button>
          ) : (
            <Button className="w-full bg-zaago-green hover:bg-zaago-green/90 text-white" onClick={() => setShowEnable(true)}>
              Enable Two-Factor Authentication
            </Button>
          )}
        </div>
      </motion.div>

      {/* Recovery codes */}
      {status?.enabled && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="zaago-card p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">Recovery codes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {status.recoveryCodesRemaining} of 10 codes remaining. Regenerating will invalidate all old codes.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setShowRegen(true)}
          >
            <RefreshCw className="w-4 h-4" /> Regenerate recovery codes
          </Button>
        </motion.div>
      )}

      <EnableMfaDialog
        open={showEnable}
        onClose={() => setShowEnable(false)}
        onEnabled={() => refetch()}
      />

      {status?.factorId && (
        <DisableMfaDialog
          open={showDisable}
          onClose={() => setShowDisable(false)}
          factorId={status.factorId}
          onDisabled={() => refetch()}
        />
      )}

      {/* Regenerate flow */}
      <Dialog open={showRegen} onOpenChange={(v) => !v && setShowRegen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate recovery codes</DialogTitle>
            <DialogDescription>
              Confirm your password and current authenticator code. Your existing recovery codes will stop working.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Password</Label>
              <Input type="password" value={regenPwd} onChange={(e) => setRegenPwd(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Authenticator code</Label>
              <div className="flex justify-center mt-2">
                <InputOTP maxLength={6} value={regenCode} onChange={setRegenCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button
              className="w-full bg-zaago-green hover:bg-zaago-green/90"
              disabled={regenBusy || !regenPwd || regenCode.length !== 6}
              onClick={handleRegenerate}
            >
              {regenBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RecoveryCodesDialog
        open={!!newCodes}
        codes={newCodes ?? []}
        onClose={() => setNewCodes(null)}
      />
    </motion.div>
  );
}
