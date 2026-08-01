import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, KeyRound, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  checkMfaLockout,
  recordMfaAttempt,
  consumeRecoveryCode,
} from "@/hooks/useMfa";
import { useToast } from "@/hooks/use-toast";

export default function MfaChallenge() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [busy, setBusy] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);

  const getSuccessDestination = () => {
    try {
      return sessionStorage.getItem("pendingPasswordRecovery") === "1"
        ? "/reset-password"
        : "/";
    } catch {
      return "/";
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = (data?.totp ?? []).find((f: any) => f.status === "verified");
      if (!totp) {
        // No factor — user shouldn't be here
        navigate(getSuccessDestination(), { replace: true });
        return;
      }
      setFactorId(totp.id);
      const lock = await checkMfaLockout("login");
      if (lock.locked) setLockSeconds(lock.secondsRemaining);
    })();
  }, [navigate]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockSeconds]);

  const handleTotp = async () => {
    if (!factorId || code.length !== 6 || lockSeconds > 0) return;
    setBusy(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (error) {
        await recordMfaAttempt("login", false);
        const lock = await checkMfaLockout("login");
        if (lock.locked) setLockSeconds(lock.secondsRemaining);
        throw new Error("Invalid code");
      }
      await recordMfaAttempt("login", true);
      navigate(getSuccessDestination(), { replace: true });
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const handleRecovery = async () => {
    if (!recovery.trim() || lockSeconds > 0) return;
    setBusy(true);
    try {
      const ok = await consumeRecoveryCode(recovery);
      if (!ok) {
        await recordMfaAttempt("recovery", false);
        const lock = await checkMfaLockout("recovery");
        if (lock.locked) setLockSeconds(lock.secondsRemaining);
        throw new Error("Invalid or already used recovery code");
      }
      await recordMfaAttempt("recovery", true);
      // Unenroll factor so user can sign in without TOTP, then re-enable from Security page.
      if (factorId) {
        try { await supabase.auth.mfa.unenroll({ factorId }); } catch {}
      }
      toast({
        title: "Recovery code accepted",
        description: "2FA has been reset. Sign in again and re-enable it from Security settings.",
      });
      await supabase.auth.signOut();
      try { sessionStorage.removeItem("pendingPasswordRecovery"); } catch {}
      navigate("/login", { replace: true });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
      setRecovery("");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    try { sessionStorage.removeItem("pendingPasswordRecovery"); } catch {}
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
      >
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-zaago-green/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-zaago-green" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Two-Factor Verification</h1>
          <p className="text-sm text-zinc-400">
            {mode === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter one of your recovery codes."}
          </p>
        </div>

        {lockSeconds > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive text-center">
            Too many attempts. Try again in {lockSeconds}s.
          </div>
        )}

        {mode === "totp" ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode} disabled={lockSeconds > 0 || busy}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="bg-zinc-800 text-white border-zinc-700" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={handleTotp}
              disabled={busy || code.length !== 6 || lockSeconds > 0}
              className="w-full bg-zaago-green hover:bg-zaago-green/90 text-white"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("recovery")}
              className="w-full text-sm text-zaago-green hover:underline flex items-center justify-center gap-1"
            >
              <KeyRound className="w-4 h-4" /> Use a recovery code instead
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              className="bg-zinc-800 border-zinc-700 text-white text-center font-mono uppercase"
              disabled={lockSeconds > 0 || busy}
            />
            <Button
              onClick={handleRecovery}
              disabled={busy || !recovery.trim() || lockSeconds > 0}
              className="w-full bg-zaago-green hover:bg-zaago-green/90 text-white"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Use recovery code"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("totp")}
              className="w-full text-sm text-zaago-green hover:underline"
            >
              Back to authenticator code
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={signOut}
          className="w-full mt-6 text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1"
        >
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </motion.div>
    </div>
  );
}
