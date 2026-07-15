I’ll fix the product volume display where it is actually missing on the list cards, not just the View Details page.

Plan:
1. Update the seller orders list card in `src/pages/CustomerOrders.tsx` so each product line shows:
   - `Product Name (unit) × quantity`
   - Example: `Buffalo Milk (500ml) × 2`
2. Update the orders management list in `src/pages/Orders.tsx` to use the same reliable product-name fallback and unit fallback:
   - `item.name || item.product_name || 'Product'`
   - `item.unit || item.product_unit`
3. Keep the existing View Details page as-is since it already shows the unit.
4. Verify with TypeScript that the pages still compile.

This will make the unit/volume visible directly on both order list cards and the order management cards before opening View Details.