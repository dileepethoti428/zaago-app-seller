

## Fix: "No products found" on Product Inventory page

### Root Cause

The `filterProducts()` function (line 141) is defined but **never called**. There is no `useEffect` that invokes it when `products`, `searchTerm`, or `statusFilter` change. So `filteredProducts` remains an empty array forever, and the page always shows "No products found" — even though `products` loads correctly from Supabase.

### Fix

Add a `useEffect` after the `filterProducts` function definition (around line 161) that calls `filterProducts()` whenever its dependencies change:

```typescript
useEffect(() => {
  filterProducts();
}, [products, searchTerm, statusFilter]);
```

### Files Changed
- `src/pages/Products.tsx` — add the missing `useEffect` call to `filterProducts`

