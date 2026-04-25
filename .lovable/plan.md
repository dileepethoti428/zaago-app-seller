## Show Cost Value Directly on Product Page

### Change

In `src/pages/Products.tsx`, update the "Cost" pill (lines ~672–685) so it **always shows the cost value inline** (no hide/reveal). Tapping it still opens the existing edit dialog.

New pill content:
```
Cost: ₹120  ✏️  🔒
```
- If `product.cost_price` is null, show `Cost: Not set` (italic muted).
- The lock icon stays as a subtle hint that the field is internal/seller-only (RLS already restricts visibility), but the value itself is no longer obscured.

### Files changed

- `src/pages/Products.tsx` — only the cost pill JSX. No state, dialog, or DB changes.
