# Fix password reset for sellers with 2FA

## Confirmed cause

The recovery email creates an AAL1 session. The current recovery guard in `ProtectedRoute` skips the MFA challenge, so `ResetPassword` calls `updateUser({ password })` before the session reaches AAL2. Supabase requires AAL2 for password or email changes whenever the account has a verified MFA factor, which produces the shown error.

## Implementation

1. Keep the recovery flag and reset destination when the email link is opened.
2. In `ProtectedRoute`, do not bypass MFA for a recovery session:
   - Check the session's current and next authenticator assurance levels.
   - If recovery is pending and the session can reach AAL2, send the seller to `/mfa-challenge`.
   - Allow `/reset-password` only after AAL2 is satisfied, while preserving the existing behavior for accounts without 2FA.
3. In `MfaChallenge`, retain the recovery intent and return to `/reset-password` after successful authenticator verification instead of Home.
4. In `ResetPassword`, verify the assurance level before submitting. If AAL2 is still required, route back to the challenge rather than attempting an update that will fail.
5. Clear the recovery flag only after a successful password update or an explicit sign-out/cancel action.

## Validation

- Test recovery for a seller with 2FA: email link → authenticator challenge → reset form → successful password update → login.
- Test recovery for a seller without 2FA: email link → reset form → successful password update → login.
- Confirm a wrong authenticator code stays on the challenge and a direct AAL1 reset submission cannot call the password update.

## Files

- `src/components/ProtectedRoute.tsx`
- `src/pages/MfaChallenge.tsx`
- `src/pages/ResetPassword.tsx`
- `src/App.tsx` only if recovery-intent handling needs consolidation

No database migration or authentication configuration change is needed.