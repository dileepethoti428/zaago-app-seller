## Low-Stock Warning on Products Page

Add a visible warning indicator on each product card when stock is low.

### Threshold
- **Low stock**: `stock_quantity > 0 && stock_quantity <= 10`
- **Out of stock**: `stock_quantity === 0` (already styled separately with stronger emphasis)

### UI Changes (`src/components/ProductCard.tsx`)
1. **Badge on the image** (next to the ACTIVE/INACTIVE badge): show an amber "Low Stock" pill with `AlertTriangle` icon when stock ≤ 10 (and > 0). Show a red "Out of Stock" pill when stock = 0.
2. **Stock line below price**: when low, color the stock text amber (`text-amber-600`) and prefix with `AlertTriangle` icon; when out, color red (`text-destructive`).
3. Use semantic tokens / existing Tailwind amber utilities, no inline hex colors.

### No changes to
- Database, business logic, or Products.tsx filters.
- Visibility — products remain visible regardless of stock.

### Files
- `src/components/ProductCard.tsx` (only)
