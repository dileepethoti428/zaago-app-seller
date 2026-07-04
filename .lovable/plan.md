## Overview

Add end-to-end Two-Factor Authentication (2FA) via TOTP authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, 2FAS) using Supabase Auth's built-in MFA. Adds a Security screen under Profile, an enrollment wizard, a login-time MFA challenge, disable flow, one-time recovery codes, and verification rate limiting.

---

## 1. Database (Supabase migration)

Supabase MFA handles TOTP factors & secrets natively. Recovery codes and rate limiting are not built-in, so we add two tables:

**`user_recovery_codes`**
- `user_id` (FK auth.users)
- `code_hash` (sha-256 hash — never store plaintext)
- `used_at` (nullable)
- Batch generation of 10 codes; single-use; regeneration invalidates all previous.

**`mfa_verification_attempts`**
- `user_id`, `attempted_at`, `success`, `ip` (optional), `context` ('login' | 'disable' | 'recovery')
- Used to enforce 5 failed attempts → 5-minute lockout.

Both tables: GRANTs + RLS (users can only see/modify own rows); `service_role` full access. A SECURITY DEFINER RPC `consume_recovery_code(code text)` verifies + marks used atomically. A SECURITY DEFINER RPC `check_mfa_lockout(context text)` returns `{locked, retry_after_seconds}`.

Add "Last enabled date" via reading `factors.created_at` from `auth.mfa_factors` (exposed through a SECURITY DEFINER RPC `get_mfa_status()` returning enabled/factorId/createdAt) — avoids client-side auth-schema access.

---

## 2. Routing (`src/App.tsx`)

New public route: `/mfa-challenge` — shown post-password when `aal1` session needs to elevate to `aal2`.
New protected route: `/profile/security` (Security page).
`ProtectedRoute` updated: if `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` returns `{ currentLevel: 'aal1', nextLevel: 'aal2' }`, redirect to `/mfa-challenge` (except when already there or on public routes).

---

## 3. Pages & Components

**`src/pages/Security.tsx`** — Status card (Enabled/Disabled badge, last enabled date), Enable/Disable button, Recovery Codes section (View remaining count, Regenerate). Uses Card/Button/Badge from design system.

**`src/components/mfa/EnableMfaDialog.tsx`** — Multi-step wizard in a Dialog:
1. Password re-confirm (`signInWithPassword` re-check against current email).
2. Enroll factor via `supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Zaago Seller' })` → show QR (from returned `totp.qr_code` SVG data URI) + manual `totp.secret` with copy button.
3. 6-digit OTP input (uses shadcn `InputOTP`) → `mfa.challenge` + `mfa.verify`.
4. Display 10 generated recovery codes with Copy All + Download `.txt`; require checkbox "I've saved my codes" before Done.

**`src/components/mfa/DisableMfaDialog.tsx`** — Password field + 6-digit code field → verify challenge → `mfa.unenroll(factorId)` → delete recovery codes.

**`src/pages/MfaChallenge.tsx`** — Standalone screen shown at login when `aal2` required. 6-digit OTP input; "Use recovery code" toggle. On success, navigates to intended route. On 5 failed attempts, disables input + shows countdown.

**`src/components/mfa/RecoveryCodesDialog.tsx`** — Reusable list + Copy/Download UI, used on enroll and regenerate.

**`src/pages/Profile.tsx`** — Add "Security" row that navigates to `/profile/security`.

---

## 4. Hooks & lib

**`src/hooks/useMfa.tsx`** — Wraps: `getStatus`, `enroll`, `verify`, `unenroll`, `regenerateRecoveryCodes`, `consumeRecoveryCode`. Uses React Query with proper invalidations.

**`src/lib/mfaRateLimit.ts`** — Client helper that calls `check_mfa_lockout` RPC before verify; records attempt after. Server RPC is source of truth.

**`src/lib/recoveryCodes.ts`** — Generates 10 codes client-side (`crypto.getRandomValues`, formatted `XXXX-XXXX-XXXX`), hashes with SHA-256 before inserting.

---

## 5. Rate Limiting

Enforced server-side via `check_mfa_lockout` RPC:
- Counts failed attempts in last 5 min per `(user_id, context)`.
- If ≥ 5 → returns `locked=true` with seconds remaining.
- Client shows countdown timer; input disabled.

---

## 6. Error Handling

Toast + inline errors for: invalid code, expired challenge (auto-refresh challenge), network failure (retry button), QR generation failure (fallback to manual key), session expiration (redirect to `/login`), duplicate enrollment (list & clean stale unverified factors before enroll), unknown API errors (generic message + log to console without secrets).

---

## 7. Security guarantees

- TOTP secret never persisted client-side beyond enroll dialog lifecycle.
- Recovery codes shown once, only hashes stored.
- No logging of codes/secrets.
- Password re-confirm required for enable & disable.
- MFA code required for disable.
- ProtectedRoute gate ensures `aal2` before any authenticated route when factor exists.

---

## Files created
- `src/pages/Security.tsx`
- `src/pages/MfaChallenge.tsx`
- `src/components/mfa/EnableMfaDialog.tsx`
- `src/components/mfa/DisableMfaDialog.tsx`
- `src/components/mfa/RecoveryCodesDialog.tsx`
- `src/hooks/useMfa.tsx`
- `src/lib/recoveryCodes.ts`
- `src/lib/mfaRateLimit.ts`

## Files modified
- `src/App.tsx` (routes)
- `src/components/ProtectedRoute.tsx` (aal2 gate)
- `src/pages/Profile.tsx` (Security entry)

## Migration
- `user_recovery_codes`, `mfa_verification_attempts` tables + RLS + GRANTs
- RPCs: `get_mfa_status`, `consume_recovery_code`, `check_mfa_lockout`, `record_mfa_attempt`

---

## Prerequisite
TOTP MFA must be enabled in the Supabase dashboard (Authentication → Providers → MFA → TOTP). I'll remind you to toggle it on before the flow will work.
