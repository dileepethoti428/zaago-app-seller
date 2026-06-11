## 1. Remove Manage Categories from sidebar
- In `src/components/Sidebar.tsx`, delete the `{ href: '/categories', label: 'Manage Categories', icon: Tag }` entry from `navigationLinks`. Remove the now-unused `Tag` import.
- Leave the `/categories` route in `App.tsx` intact so existing links (e.g. EditCategory) still resolve.

## 2. Make Add Product's category dropdown deletable inline
File: `src/pages/AddProduct.tsx` (category selector block, ~lines 657–706).

Replace the native `<select>` with a custom dropdown so each category row can render a delete button:

- Use a `Popover` (already in shadcn) with a trigger button that mimics the current select styling and shows the chosen category name (or "Select a category").
- The popover content lists:
  - One row per category: clicking the row text selects it (sets `formData.category_id`, closes popover); a small trash icon on the right opens a confirmation dialog.
  - A final "+ Other (Add New)" row preserving the existing "show new category input" flow.
- Delete flow:
  - On trash click, set a local `deleteTarget = { id, name }` state and open an `AlertDialog`.
  - Before deleting, query `products` for `seller_id = user.id` AND (`category_id.eq.${id}` OR `category.eq.${name}`) limit 1. If any exist, show the dialog in a "Cannot delete — this category has products" state with only a Close button (mirrors the existing ManageCategories logic).
  - If empty, `DELETE` from `categories` where `id = deleteTarget.id`. On success: refetch categories (call the existing loader, or invalidate via local state update — there's already a `setCategories` setter being used in this file; reuse it to drop the deleted row), toast success, and clear `formData.category_id` if it pointed at the deleted category.
- Keep all other behavior (creating a new category via "Other", validation, submit) unchanged.

### Technical notes
- The existing categories list/state in AddProduct.tsx is already loaded from Supabase; reuse that same loader function for refresh after delete (search for `setCategories(` to find it). No new query keys needed.
- No DB / RLS changes — sellers already have delete privileges on their own categories per existing ManageCategories page.