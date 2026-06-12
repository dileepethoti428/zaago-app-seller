## Plan

Make the **Edit Product** page mirror the **Add Product** page so it shows the same fields, sections, and pickers — pre-filled with the existing product's data.

### What's missing on Edit Product today
Comparing `src/pages/EditProduct.tsx` against `src/pages/AddProduct.tsx`:

1. **Category selector** — Edit uses a plain `<select>` dropdown. Add uses a searchable Popover picker with:
   - Search box
   - "Add new category" inline input
   - "Manage Categories" entry / delete confirmations
2. **Product Tags** — Edit shows the full tag grid inline (long page). Add shows a **"Select product tags"** button that opens a Dialog with all `TAG_CATEGORIES` + custom tag input, plus a "Selected Tags" chip row with × remove.
3. **Product Exact Location (GPS) section** — present in Add, missing in Edit.
4. **Product Type field** — present in Edit but not in Add (will be removed for parity).
5. **Subcategory select** — present in Edit but not in Add (will be removed for parity).
6. **Header / spacing** styles differ slightly — will align to Add Product's layout.

### Changes (only `src/pages/EditProduct.tsx`)
- Replace the category `<select>` with the same Popover-based category picker used in Add Product (search, add new, manage, delete confirm), wired to existing `formData.category_id` and pre-selected from the loaded product.
- Replace the inline Product Tags grid with the **collapsed picker + Dialog** pattern from Add Product (`tagsPickerOpen` state, "Selected Tags" chip row, custom tag input inside the dialog).
- Add the **Product Exact Location (GPS)** section, pre-filled from the product's saved latitude/longitude (and editable like in Add Product).
- Remove the **Product Type** input and the **Subcategory** select so the form matches Add Product exactly.
- Keep all existing Edit-only behavior intact: loading the product, image management (existing + newly uploaded), variants loaded via `useProductVariants`, Save/Update submit handler, and the redirect back to Products.

### Out of scope
- No database schema changes.
- No changes to Add Product, routing, sidebar, or other pages.
- No changes to business logic (price calc, GST, discount, save handler) — only field/section parity and the two picker UIs.

### Technical notes
- Reuse the same imports already present on Add Product: `Dialog*` from `@/components/ui/dialog`, `Popover*` from `@/components/ui/popover`, `ChevronsUpDown`, `Plus`, `TAG_CATEGORIES`.
- New state on Edit Product: `categoryPickerOpen`, `tagsPickerOpen`, `showNewCategoryInput`, `newCategoryName`, `deleteTarget`, `deletingCategory` — matching Add Product names so the JSX can be copied with minimal edits.
- Latitude/longitude fields: reuse whatever columns Add Product writes to on `products` (will confirm field names when implementing) and pre-fill from the loaded product row.
