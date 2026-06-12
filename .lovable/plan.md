## Problem

1. **Save error**: `EditCategory.tsx` writes to columns that don't exist in the `categories` table. Actual columns are only: `id, name, description, image_url, sort_order, is_active, created_at, updated_at, seller_id`. The page tries to update `icon, font_family, font_size, font_weight, text_color, background_color, is_gradient, gradient_start_color, gradient_end_color, display_order` — none exist, hence "Could not find the 'background_color' column".

2. **Wrong redirect**: After saving (and on the back arrow), `EditCategory` navigates to `/categories` (Manage Categories page). User wants to return to `/add-product` instead, since edit is launched from the Add Product category picker.

## Plan

Edit only `src/pages/EditCategory.tsx` — no DB migration, no other files.

### Simplify the form to match real schema
- Remove all styling fields from state, UI, and the update payload: `icon, font_family, font_size, font_weight, text_color, background_color, is_gradient, gradient_start_color, gradient_end_color`.
- Rename `display_order` → `sort_order` to match the actual column.
- Keep editable fields: **Name, Description, Image, Sort Order, Active toggle**.
- Remove the "Styling Options" card entirely.
- Remove the `CategoryStylePreview` component and the right-hand preview column; collapse to a single-column layout with the Save button at the bottom of the form.
- Remove now-unused imports (`CategoryStylePreview`, `EmojiPicker`, `Select*`, `FONT_FAMILIES`, `FONT_WEIGHTS`).

### Fix navigation
- Back arrow `onClick`: `navigate('/add-product')`.
- After successful save (`onSuccess`): `navigate('/add-product')`.
- Also invalidate the `['categories']` query (used by AddProduct) instead of `['seller-categories']`.

### Out of scope
- No changes to the `categories` table schema, AddProduct, Sidebar, or any other file.
- Manage Categories page itself is not removed (only the navigation away from EditCategory changes).
