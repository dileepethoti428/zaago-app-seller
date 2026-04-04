

## Fix: Blank Screen Caused by Duplicate Realtime Subscriptions

### Root Cause

The notification components (`SellerNotifications`, `AgentNotifications`, `CustomerNotifications`) are mounted **twice** — once in `App.tsx` (inside `AppContent`) and again in `Layout.tsx`. When both instances try to create Supabase realtime channels, the second set collides with the first, throwing `"cannot add postgres_changes callbacks after subscribe()"` which **crashes the entire app** (blank screen).

Additionally, `useRealtimeSync` uses static channel names like `'cart-changes'` and `'notifications-changes'` — these also collide on component remount during React strict mode or navigation.

### Fix

**1. Remove duplicate notification components from `Layout.tsx`** (lines 6-8, 26-28)

They're already rendered in `App.tsx`'s `AppContent`. The Layout copies are redundant and cause the crash.

**2. Add unique channel names in `useRealtimeSync.tsx`**

Replace static names like `'cart-changes'` with `cart-changes-${user.id}-${Date.now()}` (same pattern already used in the notification components).

### Files Changed
- `src/components/Layout.tsx` — remove the 3 notification component imports and renders
- `src/hooks/useRealtimeSync.tsx` — add unique suffixes to all channel names

