## Problem

`useMfaStatus` uses the React Query key `["mfa-status"]` with no user scope. When Seller A signs out and Seller B signs in on the same device (or when the AuthContext swaps users without a full reload), Seller B briefly — or persistently — sees Seller A's cached "Enabled" status. The database RPC itself is correct (it filters by `auth.uid()`), so this is purely a client-side cache-scoping bug.

## Fix

1. **Scope the MFA query to the current user** in `src/hooks/useMfa.tsx`:
   - Change `useMfaStatus` to accept the current user id from `useAuth()` and use `queryKey: ["mfa-status", user?.id]`.
   - Set `enabled: !!user?.id` so it doesn't run before auth is ready.
   - Do the same for any other user-scoped MFA reads that get added later.

2. **Clear the React Query cache on sign-out / user change** in `src/context/AuthContext.tsx`:
   - On `SIGNED_OUT`, call `queryClient.clear()` so no previous seller's MFA (or any other) data leaks.
   - On `SIGNED_IN` where the user id differs from the previous one, also call `queryClient.clear()` before setting the new user.

3. **Force a fresh MFA check on the Security page** (`src/pages/Security.tsx`): pass `refetchOnMount: "always"` (via the hook) so the badge reflects the actual signed-in seller, not a stale cache entry.

4. **Sanity check** after the fix by signing in as Seller A → enable 2FA → sign out → sign in as Seller B and confirm Security shows "Disabled" immediately.

No database or migration changes are needed — the RPC is already per-user correct.

## Files to change

- `src/hooks/useMfa.tsx` — scope `useMfaStatus` query key to `user.id`, add `enabled` + `refetchOnMount`.
- `src/context/AuthContext.tsx` — `queryClient.clear()` on sign-out and on user-id change.
- `src/pages/Security.tsx` — pass through any new hook signature (minor).