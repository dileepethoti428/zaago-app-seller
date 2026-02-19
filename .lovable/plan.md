

# Update Favicon and Website Logo

## What will change

The uploaded Zaago logo image will replace the current favicon and logo files used across the app.

## Steps

1. **Copy the uploaded image** to the `public/` folder as `zaago-new-logo.jpeg`
2. **Replace favicon reference** in `index.html` -- change `/zaago-favicon.png` to `/zaago-new-logo.jpeg`
3. **Replace apple-touch-icon** in `index.html` -- change `/zaago-logo.png` to `/zaago-new-logo.jpeg`
4. **Update `manifest.json`** -- change both icon entries from `/zaago-logo.png` to `/zaago-new-logo.jpeg`
5. **Update notification icon** in `src/components/SellerNotifications.tsx` -- change `/zaago-logo.png` to `/zaago-new-logo.jpeg`

### Files to modify
- `index.html` (favicon + apple-touch-icon)
- `public/manifest.json` (PWA icons)
- `src/components/SellerNotifications.tsx` (notification icon)

