## Move Bank + KYC into the Create Account page

Merge the Bank Details Setup and KYC Verification into the signup screen so the seller fills everything in one flow on `Login.tsx` (the "Create Account" page). Remove the redirect to `/bank-details` after signup.

### Flow (single screen, 3 steps in one card)
On the existing Create Account view, when `isSignUp` is true, replace the single submit with a stepper:

```text
Step 1 — Account     Step 2 — Bank Details     Step 3 — KYC Verification
 (email, password,    (account holder,           (Aadhaar/PAN/FSSAI numbers
  phone, business,     account no, IFSC,          + 5 document uploads:
  T&C checkbox)        bank, branch, type)        Aadhaar front/back,
                                                  PAN, FSSAI, Selfie)
```

- Header stays "Create Account / Sign up for your Zaago Seller account".
- A progress indicator (1 → 2 → 3) sits under the header.
- "Next" advances after validating the current step. "Back" returns. Final button is "Create Account & Submit for Approval".

### What happens on final submit
1. `supabase.auth.signUp(...)` with the same metadata it sends today.
2. Wait for the returned session (sign-up is configured to return one in this project — same as today's bank page flow).
3. Upload the 5 KYC files to private bucket `seller-kyc/{user.id}/...` (bucket and RLS already created).
4. `update sellers` with all bank fields, KYC numbers, KYC file paths, `kyc_submitted_at = now()`, `kyc_status = 'pending'`.
5. Toast success → `navigate('/pending-approval')`.

If signup returns no session (email confirmation required), show a toast asking the user to verify email and sign in — then on first sign-in we route them to `/bank-details` as a fallback so nothing is lost. (Keeps the existing page as a safety net.)

### Files changed
- `src/pages/Login.tsx` — convert sign-up form into a 3-step wizard; integrate uploads + bank/KYC update; keep sign-in unchanged.
- `src/components/ProtectedRoute.tsx` — after successful signup with session, allow redirect to `/pending-approval` directly (skip forced `/bank-details` push when `kyc_submitted_at` is already set).
- `src/pages/BankDetails.tsx` — keep as fallback for users who must verify email first or who skipped earlier; no functional change required.

### Out of scope
- No schema changes (already done in the previous migration).
- No admin dashboard changes (already updated to show KYC).
- No new routes.

### Validation rules (same as current BankDetails)
- IFSC `^[A-Z]{4}0[A-Z0-9]{6}$`, Account no ≥ 8 digits, Aadhaar 12 digits, PAN `^[A-Z]{5}[0-9]{4}[A-Z]$`, FSSAI 14 digits, all 5 documents required.