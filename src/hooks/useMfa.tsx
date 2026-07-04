import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/recoveryCodes";

export type MfaStatus = {
  enabled: boolean;
  factorId: string | null;
  factorCreatedAt: string | null;
  recoveryCodesRemaining: number;
};

export function useMfaStatus() {
  return useQuery({
    queryKey: ["mfa-status"],
    queryFn: async (): Promise<MfaStatus> => {
      const { data, error } = await supabase.rpc("get_mfa_status");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        enabled: !!row?.enabled,
        factorId: row?.factor_id ?? null,
        factorCreatedAt: row?.factor_created_at ?? null,
        recoveryCodesRemaining: row?.recovery_codes_remaining ?? 0,
      };
    },
  });
}

export function useCleanupUnverifiedFactors() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const stale = (data?.all ?? []).filter(
        (f: any) => f.status !== "verified"
      );
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    },
  });
}

export function useEnrollMfa() {
  return useMutation({
    mutationFn: async () => {
      // Clean stale unverified first
      const { data: list } = await supabase.auth.mfa.listFactors();
      const stale = (list?.all ?? []).filter((f: any) => f.status !== "verified");
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Zaago Seller " + new Date().toISOString(),
      });
      if (error) throw error;
      return data; // { id, type, totp: { qr_code, secret, uri } }
    },
  });
}

export function useVerifyEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ factorId, code }: { factorId: string; code: string }) => {
      const { data: challenge, error: cErr } =
        await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw vErr;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa-status"] }),
  });
}

export function useGenerateRecoveryCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");

      // Invalidate old codes
      await supabase
        .from("user_recovery_codes")
        .delete()
        .eq("user_id", uid);

      const codes = generateRecoveryCodes(10);
      const rows = await Promise.all(
        codes.map(async (c) => ({
          user_id: uid,
          code_hash: await hashRecoveryCode(c),
        }))
      );
      const { error } = await supabase.from("user_recovery_codes").insert(rows);
      if (error) throw error;
      return codes;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa-status"] }),
  });
}

export function useUnenrollMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (factorId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      if (uid) {
        await supabase.from("user_recovery_codes").delete().eq("user_id", uid);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa-status"] }),
  });
}

export async function reauthenticatePassword(password: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) throw new Error("Session expired. Please sign in again.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Incorrect password");
}

export async function verifyMfaCode(
  factorId: string,
  code: string
): Promise<void> {
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (cErr) throw cErr;
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) throw error;
}

export async function checkMfaLockout(
  context: "login" | "disable" | "recovery" | "enroll"
): Promise<{ locked: boolean; secondsRemaining: number }> {
  const { data, error } = await supabase.rpc("check_mfa_lockout", {
    _context: context,
  });
  if (error) return { locked: false, secondsRemaining: 0 };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    locked: !!row?.locked,
    secondsRemaining: row?.seconds_remaining ?? 0,
  };
}

export async function recordMfaAttempt(
  context: "login" | "disable" | "recovery" | "enroll",
  success: boolean
): Promise<void> {
  await supabase.rpc("record_mfa_attempt", {
    _context: context,
    _success: success,
  });
}

export async function consumeRecoveryCode(code: string): Promise<boolean> {
  const hash = await hashRecoveryCode(code);
  const { data, error } = await supabase.rpc("consume_recovery_code", {
    _code_hash: hash,
  });
  if (error) return false;
  return !!data;
}
