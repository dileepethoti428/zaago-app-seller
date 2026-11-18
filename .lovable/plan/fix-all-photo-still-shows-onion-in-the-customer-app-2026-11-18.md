# Fix: "All" photo still shows onion in the customer app

## Why it happens
The seller app saves your new "All" photo correctly (to your shop's settings). But the **customer app (Zaagocustomer)** never reads that saved photo — it still picks the first product photo (the onion). So changing it here has no effect there.

## What to do
1. In the seller app: after saving, refresh the Edit Categories list so the new photo shows immediately (and confirm the save succeeded with a clear message).
2. In the customer app (Zaagocustomer project): change the "All" button so it uses the seller's saved "All" photo when one exists, and only falls back to a product photo when none is set.

I can do step 1 here. Step 2 must be done in the Zaagocustomer project — paste this into it:

> For the "All" category button image: read `sellers.all_category_image_url` for the nearby open seller(s). Use the first non-empty value; if none, keep the current product-photo fallback.

## Technical details
- Seller app: `CategoriesManagerDialog.tsx` — reload `all_category_image_url` after upload; add cache-busting `?v=timestamp` to the URL so the old image isn't cached.
- Customer app: query `sellers.all_category_image_url` (column already exists, readable through existing seller read policy — verify there).
