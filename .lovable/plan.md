# Add Live Preview to Add New Product Page

## Goal
Show a live product preview card on the Add New Product page (`/products/new`) that updates in real time as the seller fills in the form — so they can see exactly how the product will appear in the customer app before saving.

## Changes

### 1. New component: `src/components/ProductLivePreview.tsx`
A lightweight, read-only card styled like the customer-app product card, showing:
- **Image**: first uploaded image preview (or an image placeholder if none yet)
- **Name**: form name (fallback text "Product Name" when empty)
- **Unit**: selected unit (e.g. "500 ml", "per litre")
- **Price**: discounted price in bold, original price struck through when a discount % is entered (matches existing price display logic)
- **Discount badge**: e.g. "10% OFF" when discount > 0
- **Stock**: "In stock (N)" or "Out of stock" hint
- **Tags**: selected product tags as small chips
- **Subscription badge**: "Subscription available" indicator when the subscription toggle is on
- Header label: "Live Preview — how customers will see this product"

All values come straight from the existing `formData`, `imagePreviews`, and `productVariants` state — no new data fetching, no save logic touched.

### 2. Update `src/pages/AddProduct.tsx`
- Import and render `<ProductLivePreview />` near the top of the form (above the fields), passing current form state as props.
- No changes to submission, validation, or any existing fields.

## Notes
- Purely presentational; nothing is saved or sent anywhere.
- If you later want the same preview on the Edit Product page, it can be added the same way.
