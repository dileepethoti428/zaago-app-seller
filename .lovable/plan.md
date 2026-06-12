## Problem
The screenshot shows the old **ProductDetail** edit dialog, not the updated `EditProduct` page. That is why you still see old fields like **Product Type**, the old category dropdown, and missing Add Product fields.

## Plan
1. **Change the Product Detail edit button**
   - Update the **Edit Product** button on the product detail page so it navigates to `/products/:id/edit`.
   - This will open the full updated Edit Product page that mirrors Add Product.

2. **Remove/bypass the old edit modal on Product Detail**
   - Stop using the outdated inline edit dialog in `src/pages/ProductDetail.tsx`.
   - This prevents users from accidentally opening the old form again.

3. **Keep existing product detail actions working**
   - Keep Back, Delete, Activate/Deactivate, product display, and variant display unchanged.
   - Only change the edit flow.

4. **Verify the actual path**
   - Confirm `/products/:id/edit` is already routed to `src/pages/EditProduct.tsx`.
   - Check there are no remaining Product Detail buttons that open the old modal.

## Technical details
- Main file to change: `src/pages/ProductDetail.tsx`
- Replace `onClick={handleEdit}` with navigation/link behavior to `/products/${product.id}/edit`.
- The old dialog code can remain unused or be removed in a focused cleanup; the key fix is that the button must no longer call `handleEdit`.