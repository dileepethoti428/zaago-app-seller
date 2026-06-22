Add a "Cost Price" input to the Add Product and Edit Product forms so sellers can record their internal sourcing cost when creating or updating a product.

Database context: the `products` table already has a `cost_price` numeric column and the proper RLS policies. No schema changes are needed.

Changes:

1. Add Product page (`src/pages/AddProduct.tsx`)
   - Add `cost_price: ''` to the `formData` state.
   - Place a new numeric input directly under the selling price field. Label it "Cost Price (Internal)" with a short note: "Only visible to you. Price you paid at the source."
   - Validate that the value, if provided, is a non-negative number.
   - Include `cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null` in the product insert payload.

2. Edit Product page (`src/pages/EditProduct.tsx`)
   - Add `cost_price: ''` to the `formData` state.
   - Populate it from the existing product (`product.cost_price ?? ''`).
   - Add the same input and label under the selling price field.
   - Validate non-negative value.
   - Include `cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null` in the update payload.

Validation:
   - If a value is entered and it is not a valid number or is negative, show a toast error and block submission, matching the behavior on the Products listing cost edit dialog.

UI notes:
   - Use the same unstyled/native number input pattern already used for price/stock in both forms.
   - Keep the field optional and allow leaving it empty (stored as `null`).