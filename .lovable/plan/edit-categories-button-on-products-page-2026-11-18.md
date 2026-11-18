# Edit Categories button on Products page

## What you'll get

- A new **Edit Categories** button next to Deactivate All, Add via Form and Quick Add at the top of Product Inventory.
- Tapping it opens a list of **all** your categories, each showing its photo, name and how many products it has.
- Each row has:
  - **Edit** (pencil) - opens the Edit Category page (name, photo, description, active). After saving or going back, you return to the Products page.
  - **Delete** (bin) - only allowed when the category has no products; otherwise a warning says how many products use it.
- A search box at the top of the list to find a category quickly, and an empty message if you have none.
- Fits on phone: the list scrolls inside the popup.

## Technical details

- New `src/components/CategoriesManagerDialog.tsx`: loads `categories` where `seller_id = user.id` (all, active and inactive), counts products per `category_id` for this seller, renders rows with `CategoryThumb`.
- `Products.tsx`: add the button (FolderEdit icon) and the dialog.
- Edit navigates to `/categories/:id/edit?from=products`; `EditCategory.tsx` returns to `/products` when `from=products`, otherwise keeps `/products/new`.
- Delete reuses the existing guard logic (block if products exist).
- Please add for all as well means for all products in categories I am asking for image 