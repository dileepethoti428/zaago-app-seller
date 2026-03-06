

# Fix: "Accept Order" Fails Due to Missing RLS Policy

## Root Cause
The `orders` table has **no UPDATE RLS policy for sellers**. When a seller clicks "Accept Order," the code tries to update the order's status (`seller_id = auth.uid()`), but all existing UPDATE policies check against `user_id` (customer) or `agent_id` (delivery partner). The seller's `auth.uid()` doesn't match any of these, so Supabase silently rejects the update, causing the error.

## Fix
Add a single database migration with an UPDATE RLS policy for sellers:

```sql
CREATE POLICY "Sellers can update their orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());
```

This allows sellers to update orders where they are the assigned seller, enabling accept, reject, pack, and notify actions to work properly.

## Files Changed
- **1 new migration file** — adds the missing RLS policy

No frontend code changes needed. The existing `useSellerOrderActions` hook already has proper error handling; it just couldn't update because of the missing policy.

