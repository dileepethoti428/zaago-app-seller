# Category photos in the seller app

## What you'll get
1. **Photo when creating a new category** - In Add Product and Edit Product, when a seller types a new category name, a "Category photo" picker appears below it. The photo is saved with the new category.
2. **Better photo on Edit Category** - The existing photo picker gets a clear hint: "Square photo, 512x512, white or see-through background, under 1 MB". Photos are cropped to a square, resized to 512x512 and shrunk under 1 MB automatically before saving.
3. **Photos in the category picker** - When choosing a category in Add/Edit Product, each category shows its small round photo next to its name (a plain icon if it has none).
4. **Similar-name warning** - When typing a new category name close to an existing one (for example "dairy milk" vs "dairy"), a note says "Similar category exists: Dairy - use it?" with a one-tap button, so fewer duplicates are created.

## Not included
- Merging the existing duplicate categories (dairy, dairy milk, cow milk, fresh_milk_dairy). This moves products between categories, so I'll ask before doing it.

## Technical details
- Shared helper `src/utils/categoryImage.ts`: center-crop to square, resize to 512x512 via canvas, export JPEG/PNG under 1 MB, upload to existing `product-images` bucket at `category-images/`, return public URL.
- `EditCategory.tsx` uses the helper instead of current compress/upload.
- `AddProduct.tsx` / `EditProduct.tsx`: file input in new-category block; upload before the categories insert and pass `image_url`. Categories query already selects `image_url` in AddProduct; add it in EditProduct; render thumbnail in picker rows.
- Similar-name check: normalize names (lowercase, `_`/`-` to spaces) and match on contains/shared word, client-side.
- No database changes needed (`categories.image_url` exists).
