

# Fix Account Deactivated Page

## Two Issues to Fix

### 1. Add WhatsApp Contact Link
Replace the static "Kindly contact customer care." text with a clickable WhatsApp link to **+91-7842343642**.

### 2. Fix Sign Out Button
The Sign Out button doesn't work because the session was already cleared during the deactivation check (in `getSessionWithRetry`). When the user taps "Sign Out", `supabase.auth.signOut()` fails silently since there's no active session. Fix: after calling `signOut()`, force-navigate to the login page regardless of success/failure.

## Changes

### File: `src/pages/AccountDeactivated.tsx`
- Replace the "Kindly contact customer care." paragraph with a WhatsApp link: `https://wa.me/917842343642`
- Update the Sign Out button to:
  - Clear state via `signOut()`
  - Then navigate to `/login` using `useNavigate` from react-router-dom, ensuring the user always leaves this page

