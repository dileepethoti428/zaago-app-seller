

# Block Deactivated Sellers at Login

## Problem
When a seller's account is marked as inactive/deactivated by admin, they can still log in successfully. The `ProtectedRoute` tries to redirect them to `/account-deactivated` afterward, but the login itself succeeds -- which is confusing.

## Solution
Check the `sellers.is_deactivated` flag immediately after successful login in the `signIn` function. If the seller is deactivated, sign them out right away and show an error message: **"Your account has been deactivated. Kindly contact customer care."**

## Changes

### File: `src/context/AuthContext.tsx`

In the `signIn` function, after `signInWithPassword` succeeds:
1. Query the `sellers` table for the logged-in user's `is_deactivated` status
2. If `is_deactivated` is `true`, immediately call `supabase.auth.signOut()`
3. Show a toast: "Your account has been deactivated. Kindly contact customer care."
4. Return an error so the login page doesn't navigate away

### File: `src/pages/AccountDeactivated.tsx`

Update the message text to say: **"Kindly contact customer care"** instead of "Please contact admin for reactivation."

No other files need changes.
