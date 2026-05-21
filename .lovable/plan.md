## Add KYC Documents to Bank Details Setup

Extend the existing Bank Details Setup page to also collect KYC documents during signup so admins can review and approve sellers from one place.

### Scope
- Page: `src/pages/BankDetails.tsx` (no new page, no route changes)
- New KYC fields collected alongside bank info:
  - Aadhaar Card — number + front/back image upload
  - PAN Card — number + image upload
  - Selfie / Live Photo — image upload (camera capture preferred on mobile)
  - FSSAI License — number + license image upload

### Database changes (`sellers` table)
Add columns:
- `aadhaar_number` text
- `aadhaar_front_url` text
- `aadhaar_back_url` text
- `pan_number` text
- `pan_image_url` text
- `selfie_url` text
- `fssai_number` text
- `fssai_license_url` text
- `kyc_submitted_at` timestamptz
- `kyc_status` text default `'pending'` (`pending` | `approved` | `rejected`)

Existing `approval_status` continues to gate access (stays `pending` until admin approves).

### Storage
- Create a private bucket `seller-kyc` (not public).
- RLS on `storage.objects`:
  - Seller can `INSERT`/`SELECT` their own files in `seller-kyc/{auth.uid()}/...`
  - Admins (via existing role check / `has_role`) can `SELECT` all KYC files.

### UI (BankDetails.tsx)
- Add a new section **"KYC Verification"** below Bank Account Details with:
  - Text inputs for Aadhaar, PAN, FSSAI numbers (with format validation: Aadhaar 12 digits, PAN regex, FSSAI 14 digits).
  - File upload tiles for: Aadhaar front, Aadhaar back, PAN image, FSSAI license, Selfie (selfie uses `capture="user"` on mobile).
  - Show thumbnail previews after upload; reuse `compressImage` helper.
- All KYC fields required on submit (remove "Skip for Now" or keep it but only when KYC already submitted).
- On submit: upload files to `seller-kyc/{userId}/...`, save URLs + numbers + bank fields in one `update`, set `kyc_submitted_at = now()`, `kyc_status = 'pending'`.
- After submit → redirect to `/pending-approval` (already exists).

### Admin Dashboard
- Page `src/pages/SellerApprovals.tsx` already exists. Extend the seller detail/row view to display:
  - KYC numbers (Aadhaar / PAN / FSSAI)
  - Clickable thumbnails for each uploaded document + selfie (open in lightbox/new tab using signed URLs since bucket is private)
- Approve/Reject already updates `approval_status`; also set `kyc_status` accordingly.

### Files touched
- `supabase/migrations/*` — schema + bucket + RLS (via migration tool)
- `src/pages/BankDetails.tsx` — add KYC section, uploads, validation, submit logic
- `src/pages/SellerApprovals.tsx` — show KYC docs to admin

### Out of scope
- No third-party KYC API verification (Aadhaar/PAN OCR or DigiLocker) — admin manually reviews.
- No changes to login/signup screens themselves.