# Plan: Show products per category + edit shortcuts

## Goal
On the **Manage Categories** page, let the seller:
1. Expand any category card to see which products are assigned to it.
2. Edit the category (already exists) and jump to edit any of its products from the same place.

## Changes (single file: `src/pages/ManageCategories.tsx`)

### 1. Make each category card expandable
- Wrap each category `Card` in a `Collapsible` (already in the UI kit: `@/components/ui/collapsible`).
- Add a chevron button on the card that toggles open/closed.
- Show a small count badge next to the category name: "X products".

### 2. Fetch products per category (lazy, on expand)
- New `useQuery` keyed by `['category-products', categoryId]`, enabled only when that category is expanded.
- Query: `products` table where `seller_id = user.id` AND `category = <category.name>` (the products table stores category by name string today — confirmed by existing AddProduct/Products code). Select `id, name, price, image_url, stock_quantity, is_active`.
- Sort by name.

### 3. Expanded content UI
For each product show:
- Thumbnail (image_url) + name
- Price + stock + active/inactive pill
- **Edit** button → `navigate('/products/' + id + '/edit')` (uses existing EditProduct route)

Empty state: "No products in this category yet" + a small "Add product" button → `/add-product`.

### 4. Category edit
Already wired (`/categories/:id/edit` via the pencil button) — no change, just confirming it stays.

## Out of scope
- No schema changes.
- No changes to AddProduct/EditProduct themselves.
- No drag-to-reassign products between categories (can be a follow-up if you want it).

## Files touched
- `src/pages/ManageCategories.tsx` (only)

## Open question
Products in this project are linked to categories by **name string** (`products.category`), not by `categories.id`. The plan uses name-match, which works with current data. Want me to also migrate to id-based linkage? (Bigger change — recommend doing it separately.)
