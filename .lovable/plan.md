

## Fix: "null value in column body" Error When Updating Product Stock

### Root Cause

The database trigger `notify_low_stock` fires on product updates and inserts rows into the `notifications` table. It sets `title` and `message` columns — but the `notifications` table has a **`body` column that is NOT NULL with no default value**. The trigger never sets `body`, so Postgres rejects the insert.

The same issue exists in `notify_stock_subscribers` (fires when stock goes from 0 to >0).

### Fix

Add a default value to the `notifications.body` column so trigger-created notifications don't fail. We'll default it to an empty string `''`.

**Single migration:**
```sql
ALTER TABLE notifications ALTER COLUMN body SET DEFAULT '';

-- Backfill any existing NULL bodies (shouldn't exist due to NOT NULL, but just in case)
UPDATE notifications SET body = '' WHERE body IS NULL;
```

### Files Changed
- One database migration to set a default on `notifications.body`

