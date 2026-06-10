# Safer Category Deletion

Update the delete flow on **Manage Categories** so a category can't be deleted while it still has products linked to it.

## Behavior

- Each category already knows its product count (via the existing `countFor(category)` helper).
- When the user clicks the trash icon:
  - **If product count > 0** → open the existing confirm dialog in a "blocked" state:
    - Title: "Cannot delete category"
    - Description: "This category has N product(s). Please move or delete those products before deleting the category."
    - Footer: only a "Close" button (no destructive Delete action).
  - **If product count = 0** → keep current confirm dialog with a clear warning ("This action cannot be undone.") and the red **Delete** button that calls `deleteMutation`.

## Implementation notes (frontend only, `src/pages/ManageCategories.tsx`)

- Store the full category object (or `{ id, productCount }`) in state instead of just `deleteId`, so the dialog can branch on count.
- Render dialog body/footer conditionally based on whether the selected category has products.
- As a safety net (in case counts are stale), the `deleteMutation`'s `mutationFn` re-checks product count with a quick `products` query before deleting; if any exist, abort and show a toast "Category has products and can't be deleted."
- No DB / RLS / migration changes.
