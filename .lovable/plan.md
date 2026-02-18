

# Fix: Deactivated Seller Login Not Blocked

## Root Cause

The admin dashboard marks sellers as inactive by setting the `status` column to `'inactive'`. However, the seller app only checks the `is_deactivated` boolean column, which remains `false`. These two fields are out of sync, so the deactivation check never triggers.

**Current database state for "Pkr":**
- `status` = `'inactive'` (set by admin)
- `is_deactivated` = `false` (what the app checks)

## Fix

Update the seller app to check **both** fields: `is_deactivated = true` OR `status = 'inactive'`. This way, no matter which field the admin sets, the seller will be blocked.

## Changes

### File: `src/context/AuthContext.tsx`

In the `signIn` function, update the deactivation check to also consider `status`:

```typescript
const { data: seller } = await supabase
  .from('sellers')
  .select('is_deactivated, status')
  .eq('user_id', data.user.id)
  .maybeSingle();

if (seller?.is_deactivated || seller?.status === 'inactive') {
  // sign out and show error
}
```

### File: `src/components/ProtectedRoute.tsx`

In `checkBankDetailsAndRedirect`, update the deactivation check to also consider `status`:

```typescript
// Line 61 currently checks only is_deactivated
if ((data as any).is_deactivated || (data as any).status === 'inactive') {
```

Also update the query on line 42 to include `status`:

```typescript
.select('bank_name, approval_status, is_deactivated, status')
```

### File: `src/context/AuthContext.tsx` (session restore)

Add a deactivation check in the `getSessionWithRetry` function so that if a deactivated seller returns with an existing session, they get signed out immediately instead of seeing the app briefly.

These three changes ensure that whether admin sets `status = 'inactive'` or `is_deactivated = true`, the seller is blocked at every entry point: login, session restore, and route navigation.

