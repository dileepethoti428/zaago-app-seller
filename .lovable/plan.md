## Goal
When a seller doesn't pick any product tags, save the product with no tags (instead of auto-generating tags like "Fresh", "Best Seller", etc.). Currently, leaving the tag picker empty triggers auto-tagging, which is why products show tags the seller never chose.

## Changes

### 1. `src/pages/AddProduct.tsx`
- Replace the auto-tagging fallback (lines ~372-389) so that `finalTags = formData.selectedTags` always. Remove the `else` branch that builds `AutoTaggingData` and calls `generateAutoTags`.
- Remove the now-unused `generateAutoTags` / `AutoTaggingData` imports.
- Update the helper text under the tag picker (line ~1194) from "Auto-tagging: If you don't select any tags…" to a neutral note like "Tags are optional. If you don't select any, your product will be shown without tags."

### 2. `src/pages/EditProduct.tsx`
- Same change as AddProduct: always use `formData.selectedTags` (lines ~373-389), drop the auto-tag branch and unused imports.
- Update the helper text at line ~1066 to the same neutral wording.

### 3. No other changes
- `ProductTags.tsx` already returns `null` when `tags` is empty, so the Products list and Customer Product Detail pages will automatically render nothing when a product has no tags.
- `generateAutoTags` in `src/config/productTags.ts` can stay (unused) — leaving it avoids touching unrelated config.

## Out of scope
- No backfill of existing products that were already saved with auto-generated tags. (Tell me if you also want those cleared.)
