## Add Edit Category option in Add Product page

In `src/pages/AddProduct.tsx`, the category picker `Popover` currently shows each category row with a trash (delete) button. Add an edit (pencil) button next to it.

### Changes
- Import `Pencil` (or `Edit`) from `lucide-react`.
- In each category row inside the popover, render an Edit icon button to the left of the existing Trash button.
- On click: close the popover and `navigate(`/categories/${category.id}/edit`)` — this reuses the existing `EditCategory` page already wired up at that route in `App.tsx`.
- Stop event propagation so clicking edit doesn't also select the category.
- No DB changes, no other behavior changes (delete flow, "Other (Add New)", validation, submit all remain as-is).
