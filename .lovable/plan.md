
## Root Cause (Clear)

When Supabase sends the reset email, it redirects to `https://zaago-seller-app.vercel.app/#access_token=...&type=recovery`. The `#` means it lands on the **root route** (`/`), not `/reset-password`. The `AppContent` component loads, Supabase JS processes the hash and fires `PASSWORD_RECOVERY`, but nobody is listening at the root to redirect the user.

The user doesn't want to change the Site URL in Supabase (it's used for another app). So we fix this purely in code.

## Fix

Add a `useEffect` in `AppContent` (in `App.tsx`) that:
1. On mount, checks if `window.location.hash` contains `type=recovery`
2. If yes, immediately calls `navigate('/reset-password')` — the hash/token stays in memory because Supabase JS has already parsed it, and the `ResetPassword` page will receive the `PASSWORD_RECOVERY` auth event correctly

This is one small addition to the existing comment block at line 71-72 in `App.tsx`.

## Files Changed
- `src/App.tsx` — add `useEffect` that detects `type=recovery` in URL hash and redirects to `/reset-password`
