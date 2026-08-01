# Inline 2FA Password Reset

## Goal
Make the recovery link always open the Reset Password form first. For accounts with 2FA, reveal the authenticator-code field below the new-password and confirm-password fields, matching the supplied reference, without sending the seller to a separate verification screen.

## Implementation
- Refactor `ResetPassword` so the initial security check records whether verified TOTP is enabled but never replaces the password form with a standalone “Verify Your Identity” page.
- Keep the password fields visible and preserve their entered values throughout the recovery flow.
- For a 2FA-enabled account, reveal the six-digit Authenticator Code section beneath the password fields once the seller starts entering the new password.
- Use one **Update Password** action:
  - validate both passwords and the six-digit code;
  - create and verify the Supabase MFA challenge to elevate the recovery session to AAL2;
  - immediately update the password in the same submission after successful verification.
- For accounts without 2FA, update the password normally without showing or requiring an authenticator code.
- Preserve the existing lockout, invalid-code feedback, recovery-session cleanup, success state, sign-out, and login redirect behavior.

## Verification
- Check a recovery session with 2FA: reset form opens first, code appears inline below entered passwords, valid code updates the password, and invalid code keeps the form and password values intact.
- Check a recovery session without 2FA: no code field appears and password reset succeeds normally.
- Confirm the recovery flow never redirects to `/mfa-challenge` or into the app before the password is changed.