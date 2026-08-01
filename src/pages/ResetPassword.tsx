import { useState, useEffect } from "react";
import { Lock, CheckCircle, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { checkMfaLockout, recordMfaAttempt } from "@/hooks/useMfa";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const prepareRecoverySession = async () => {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const verifiedFactor = (factors?.totp ?? []).find((factor) => factor.status === "verified");
        if (!verifiedFactor) throw new Error("No verified authenticator was found for this account.");

        setFactorId(verifiedFactor.id);
        setMfaRequired(true);
        const lock = await checkMfaLockout("login");
        if (lock.locked) setLockSeconds(lock.secondsRemaining);
      } else {
        setMfaRequired(false);
      }
    };

    const acceptSession = async () => {
      setIsValidSession(true);
      try {
        await prepareRecoverySession();
      } catch (error: any) {
        toast({
          title: "Unable to verify account security",
          description: error.message || "Please request a new password reset link.",
          variant: "destructive",
        });
      } finally {
        setCheckingSession(false);
      }
    };

    // Listen for auth state changes (PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event, session);

        if (event === "PASSWORD_RECOVERY") {
          try { sessionStorage.setItem("pendingPasswordRecovery", "1"); } catch {}
          void acceptSession();
        } else if (event === "SIGNED_IN" && session) {
          void acceptSession();
        }
      }
    );

    // Also check existing session
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await acceptSession();
      } else {
        setCheckingSession(false);
      }
    };
    
    // Give Supabase a moment to process the URL hash
    setTimeout(checkExistingSession, 1000);

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(
      () => setLockSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  // Redirect if no valid session after checking
  useEffect(() => {
    if (!checkingSession && !isValidSession) {
      toast({
        title: "Invalid or Expired Link",
        description: "Please request a new password reset link.",
        variant: "destructive",
      });
      navigate("/forgot-password");
    }
  }, [checkingSession, isValidSession, navigate, toast]);

  const handleMfaVerification = async () => {
    if (!factorId || mfaCode.length !== 6 || lockSeconds > 0) return;

    setVerifyingMfa(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verifyError) {
        await recordMfaAttempt("login", false);
        const lock = await checkMfaLockout("login");
        if (lock.locked) setLockSeconds(lock.secondsRemaining);
        throw new Error("Invalid authenticator code");
      }

      await recordMfaAttempt("login", true);
      setMfaRequired(false);
      setMfaCode("");
      toast({ title: "Identity verified", description: "You can now set your new password." });
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setMfaCode("");
    } finally {
      setVerifyingMfa(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in both password fields.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
        setMfaRequired(true);
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = (factors?.totp ?? []).find((factor) => factor.status === "verified");
        setFactorId(verifiedFactor?.id ?? null);
        toast({
          title: "Authenticator verification required",
          description: "Enter your 6-digit code before updating your password.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      try { sessionStorage.removeItem("pendingPasswordRecovery"); } catch {}
      setSuccess(true);
      toast({
        title: "Password Updated",
        description: "Your password has been reset successfully.",
      });

      // Sign out and redirect to login after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
            <h1 className="text-xl font-semibold text-white">Verifying reset link...</h1>
            <p className="text-zinc-400 text-sm mt-2">Please wait while we verify your password reset link.</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="text-green-500">
                <CheckCircle className="w-16 h-16" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Password Reset!</h1>
            <p className="text-zinc-400 text-base">
              Redirecting you to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-zaago-green/10 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-zaago-green" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Verify Your Identity</h1>
              <p className="text-zinc-400 text-base">
                Enter the 6-digit code from your Authenticator app to continue resetting your password.
              </p>
            </div>

            {lockSeconds > 0 && (
              <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive text-center">
                Too many attempts. Try again in {lockSeconds}s.
              </div>
            )}

            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                  disabled={verifyingMfa || lockSeconds > 0}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} className="bg-zinc-800 text-white border-zinc-700" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="button"
                onClick={handleMfaVerification}
                disabled={verifyingMfa || mfaCode.length !== 6 || lockSeconds > 0}
                className="w-full bg-zaago-green hover:bg-zaago-green/90 text-white"
              >
                {verifyingMfa ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="text-green-500">
                <Lock className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
            <p className="text-zinc-400 text-base">Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div>
              <label className="text-white text-base font-medium mb-3 block">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base"
                />
              </div>
              <p className="text-sm text-zinc-500 mt-2">Password must be at least 6 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="text-white text-base font-medium mb-3 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold text-base hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
