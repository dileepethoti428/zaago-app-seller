
## Two Changes to Implement

### 1. Image Upload Guidelines in AddProduct & EditProduct

**Where to add**: In both `src/pages/AddProduct.tsx` and `src/pages/EditProduct.tsx`, right below the "Product Image" label (before the dashed upload area).

**What to add**: A compact info box with all 6 guidelines using icons/badges:
- 📐 Aspect Ratio: 1:1 (Square)
- 📏 Recommended: 1000×1000 px | Minimum: 500×500 px
- 💾 Max File Size: 5 MB
- 🗂 Formats: JPG, JPEG, PNG only
- 🎯 Product should cover 80–90% of frame
- 🚫 No watermarks or text

**AddProduct.tsx** — guidelines go after line 750 (after the Camera label), before the dashed upload area at line 752.

**EditProduct.tsx** — guidelines go after line 891 (after the Camera label), before the existing images section at line 893.

Also update the `accept` attribute on the file input from `image/*` to `image/jpeg,image/jpg,image/png` to enforce JPG/PNG only (both files).

---

### 2. Location Cache Extended from 1 Day → 1 Month

**File**: `src/hooks/useCachedLocation.tsx`

**Change**:
- Line 21: `const ONE_DAY_MS = 24 * 60 * 60 * 1000;` → `const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;`
- Line 51: `staleTime: ONE_DAY_MS` → `staleTime: ONE_MONTH_MS`
- Line 52: `gcTime: ONE_DAY_MS` → `gcTime: ONE_MONTH_MS`
- Line 158: `storage.setWithExpiry(LOCATION_CACHE_KEY, locationData, ONE_DAY_MS)` → `storage.setWithExpiry(LOCATION_CACHE_KEY, locationData, ONE_MONTH_MS)`

This means:
- GPS + Google Places API is only called once every **30 days** per device (down from once per day)
- Significant API cost savings on reverse geocoding calls

---

### Files Changed
- `src/pages/AddProduct.tsx` — add guidelines box + restrict file accept to jpg/jpeg/png
- `src/pages/EditProduct.tsx` — add same guidelines box + restrict file accept
- `src/hooks/useCachedLocation.tsx` — change TTL from 1 day to 1 month
