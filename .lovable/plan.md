# Fix: password reset link ends up on Home instead of Reset Password

## What happens today

Clicking the Supabase reset link signs the user in with a temporary recovery session. Two things then hijack the flow:

1. `ProtectedRoute` runs its 2FA check for any signed-in user — including on `/reset-password`, which is in its public-route list — and sends them to `/mfa-challenge`.
2. After the 2FA code is verified, `MfaChallenge` always navigates to `/`, so the reset intent is lost and the user lands on Home with no chance to set a new password.

## Fix

Remember that the session came from a recovery link, and route around it:

- When the recovery hash is detected (in `App.tsx`), store a short-lived `pendingPasswordRecovery` flag in `sessionStorage` before navigating to `/reset-password`. Also set it in `ResetPassword` on the `PASSWORD_RECOVERY` auth event, so a direct hit on the page works too.
- `ProtectedRoute`: skip the 2FA/bank/approval redirects entirely while on `/reset-password` (and while the recovery flag is set), so the user is never pulled off the page.
- `MfaChallenge`: if the recovery flag is set, redirect to `/reset-password` after a successful code instead of `/`. (Only relevant if 2FA is still triggered by another route.)
- `ResetPassword`: clear the flag once the password is successfully updated, then continue with the existing sign-out/redirect-to-login behaviour.

## Notes

- No database or Supabase auth-config changes needed.
- The reset link's `redirectTo` in `ForgotPassword.tsx` points at `https://zaago-app-seller.vercel.app/reset-password`; leave as-is unless you want it changed to the current domain.
- Files touched: `src/App.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/MfaChallenge.tsx`, `src/pages/ResetPassword.tsx`.
