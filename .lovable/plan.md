## Problem

On the Edit Product page, tapping the minus (−) button on a variant does not remove it from the screen.

## Root cause

In `src/pages/EditProduct.tsx`, the effect that loads existing variants into local form state is:

```ts
useEffect(() => {
  if (existingVariants.length > 0 && variants.length === 0) {
    // populate variants from DB
  }
}, [existingVariants, variants.length]);
```

Because `variants.length` is in the dependency array, this effect re-runs every time the variants array changes. When the user removes the **last remaining** variant, `variants.length` becomes `0`, the guard passes again, and the effect immediately re-populates the list from the originally-fetched `existingVariants` — so the removed variant instantly reappears. (Same reappearance happens after tapping minus on a single-variant product, which matches what you're seeing.)

A secondary issue: variant cards use `key={index}`. When items are removed, React reuses DOM by index, which can also cause stale rendering of input values.

## Fix

1. **`src/pages/EditProduct.tsx`**
   - Replace the `variants.length === 0` guard with a one-shot load using a `useRef` flag (e.g. `variantsLoadedRef`) so existing variants are copied into form state only the first time they arrive from the hook. After that, user edits (including deletions down to zero) are respected.
   - Remove `variants.length` from the effect's dependency array.

2. **`src/components/ProductVariants.tsx`**
   - Give each variant a stable local `key` (either the existing DB `id` when present, or a client-generated `_key` created when the variant is added) and use it instead of `key={index}` so removals don't leave stale card state.

3. **Save flow sanity check (no behavior change intended)**
   - Keep the current "delete all product_variants for this product, then insert the remaining ones" logic in `handleSubmit`. Add error logging on the delete call so any future RLS/permission failure is visible in the console (silent today).

## Verification

- Open Edit Product for a product with 1 variant → tap − → card disappears and stays gone → Save → reopen → variant is gone in DB.
- Open Edit Product for a product with 2+ variants → remove any one → remaining variants keep their correct values → Save → reopen → only removed variant is gone.
- Add a new custom variant, remove it before saving → it disappears immediately.

No database or RLS changes are required — the existing `Sellers can manage their own product variants` policy already permits the delete/insert.
