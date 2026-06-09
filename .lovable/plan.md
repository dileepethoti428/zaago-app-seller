# Fix Notifications page showing "No notifications found"

## Root cause
The `public.notifications` table has only INSERT RLS policies. There is no `SELECT` policy, so every read from the client is blocked by RLS and returns an empty array. Your account (`034f84a0…`) actually has 148 seller notifications in the database (98 `stock_alert` + 50 `delivery`), they just can't be fetched from the browser.

## Changes

### 1. Database migration — add SELECT policies on `notifications`
- Add policy: a user can `SELECT` rows where `user_id = auth.uid()`.
- Add policy: a user can `UPDATE` rows where `user_id = auth.uid()` (so "Mark as read" / "Mark all as read" actually persist — they're silently failing today for the same reason).
- Grant `SELECT, UPDATE` on `public.notifications` to `authenticated` (kept narrow — no DELETE, no anon access).

No schema/column changes. No effect on the existing INSERT policies used by triggers/edge functions.

### 2. `src/pages/Notifications.tsx` — small UX fixes (frontend only)
- Replace the `.single()` seller lookup with `.maybeSingle()` so a missing seller row doesn't throw.
- Keep the existing "if seller, show only `role='seller'`" filter (this matches what you want — stock alerts, delivery updates, etc. for the seller).
- Fix the type-filter dropdown values so they line up with the actual `type` values stored for sellers (`stock_alert`, `delivery`, plus future `order_update`, `payment`, `system`). Currently the option `order` doesn't match anything in the DB.
- Re-fetch on the realtime `notifications` INSERT event (already wired in `useRealtimeSync`) so new stock alerts appear without a refresh.

## Out of scope
- Firebase / push delivery — untouched, you confirmed it's working.
- No changes to how notifications are created (triggers / edge functions stay as-is).
- No changes to admin or customer notification flows.

## Verification
After the migration:
1. Log in as the seller, open Notifications → should immediately list the 98 stock alerts + 50 delivery notifications.
2. Click "Mark all as read" → unread count drops to 0 and persists on refresh.
3. Trigger a new low-stock event → new row appears in the list via realtime.
