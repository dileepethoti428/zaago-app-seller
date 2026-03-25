
## Root Cause

There are **two separate issues** causing the wrong redirect:

### Issue 1 — Wrong `redirectTo` URL in `ForgotPassword.tsx`
Line 29: `redirectTo: 'https://zaago-seller.vercel.app/reset-password'`

This is hardcoded to the **old URL** (`zaago-seller.vercel.app`). Your app is now at `zaago-seller-app.vercel.app`. So the reset email sends users to the old domain, which is `zaago.online` (some other app).

### Issue 2 — Supabase "Redirect URLs" whitelist in the dashboard
Even after fixing the code, Supabase will **block the redirect** unless `https://zaago-seller-app.vercel.app/reset-password` is explicitly added to the allowed redirect URLs list in the Supabase Auth settings.

---

## What Needs to Happen

### 1. Code fix — Update `redirectTo` in `ForgotPassword.tsx`
Change line 29 from:
```
redirectTo: `https://zaago-seller.vercel.app/reset-password`
```
to:
```
redirectTo: `https://zaago-seller-app.vercel.app/reset-password`
```

### 2. Supabase Dashboard — Add URL to Redirect Allow List
You must manually add this URL in Supabase:

**Go to**: Supabase Dashboard → Authentication → URL Configuration

Add these two entries to **"Redirect URLs"**:
```
https://zaago-seller-app.vercel.app/reset-password
https://zaago-seller-app.vercel.app/**
```

Also set the **"Site URL"** to:
```
https://zaago-seller-app.vercel.app
```

This is a one-time manual step you do in the Supabase dashboard — I cannot do this for you from code, but I'll give you the direct link.

---

## Files Changed
- `src/pages/ForgotPassword.tsx` — update `redirectTo` URL to new domain

## Dashboard Steps (Manual — You Do This)
1. Open Supabase → Authentication → URL Configuration
2. Set **Site URL** = `https://zaago-seller-app.vercel.app`
3. Add to **Redirect URLs**: `https://zaago-seller-app.vercel.app/**`
4. Save
