# Keep 2FA inside the Reset Password page

## Goal

When a seller opens a password-reset email link, keep them on `/reset-password` throughout the process:

- Sellers without 2FA see the new-password form immediately.
- Sellers with 2FA first see a 6-digit Authenticator code form on the same page.
- After successful verification, the same page reveals the new-password fields and allows the reset.

## Changes

1. Update `ResetPassword` to detect the recovery session's authenticator assurance level after validating the email link.
2. If the account requires AAL2, load its verified TOTP factor and display an inline 6-digit code form instead of the password form.
3. Reuse the existing MFA challenge, verification, failed-attempt, and lockout logic. After a valid code upgrades the session to AAL2, switch the same page to the password form without navigating elsewhere.
4. Keep the existing password validation, update, success message, sign-out, and login redirect.
5. Change `ProtectedRoute` so a pending password recovery is allowed to remain on `/reset-password`; it must not redirect that flow to the standalone `/mfa-challenge` page.
6. Keep the standalone MFA challenge unchanged for normal sign-in. It will no longer handle password-recovery sessions.

## Validation

- 2FA seller: reset link → inline Authenticator code → inline new-password form → successful update → login.
- Seller without 2FA: reset link → new-password form directly → successful update → login.
- Invalid codes show an error and respect the existing lockout rules without leaving the reset page.
- The password update cannot run until the 2FA-enabled recovery session reaches AAL2.

## Files

- `src/pages/ResetPassword.tsx`
- `src/components/ProtectedRoute.tsx`

No database or Supabase configuration changes are required.