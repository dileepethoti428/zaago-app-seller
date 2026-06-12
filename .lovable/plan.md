## Plan

Fix the Edit Category page so both actions return to the real Add Product page instead of a missing route.

### What I will change
- In `src/pages/EditCategory.tsx`, replace the incorrect redirect path `/add-product` with the existing route `/products/new`.
- Apply this to:
  - The back arrow button
  - The redirect after clicking **Save Changes** successfully

### Why this fixes it
Your app does not have a route named `/add-product`. The Add Product page is registered as `/products/new` in `src/App.tsx`, so navigating to `/add-product` shows the 404 page.

### Scope
- No database changes.
- No sidebar changes.
- No category form changes.
- Only fix the wrong navigation path causing the 404.