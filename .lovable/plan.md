## Problem

In `src/pages/Settings.tsx`, `saveProfile()` calls:

```ts
supabase.from('profiles').upsert({ user_id, full_name, phone, updated_at })
```

The `profiles` table's primary key is `id` (not `user_id`), while `user_id` has a `UNIQUE` constraint. Without an explicit conflict target, Supabase upsert conflicts on the primary key (`id`). Since we don't pass `id`, Postgres tries an INSERT with a new `id`, which then violates the `UNIQUE (user_id)` constraint → `duplicate key value violates unique constraint`.

`saveBankDetails()` on the `sellers` table has the same pattern and same latent bug.

## Fix

Tell upsert to resolve conflicts on `user_id`:

1. `src/pages/Settings.tsx` → `saveProfile`
   ```ts
   .upsert({ user_id: user.id, full_name, phone, updated_at }, { onConflict: 'user_id' })
   ```

2. `src/pages/Settings.tsx` → `saveBankDetails` (both call sites on `sellers`)
   ```ts
   .upsert({ ...sellerFields, user_id: user.id, updated_at }, { onConflict: 'user_id' })
   ```

No database, RLS, or schema changes needed — `user_id` unique constraints already exist on both tables.

## Verification

- Save Profile with existing row → success toast, no duplicate-key error.
- Save Profile as a brand-new user (no row yet) → row is created.
- Save Business Info / Bank Details → same behavior.
- Confirm no regression for other sellers (per-user scoping unchanged).