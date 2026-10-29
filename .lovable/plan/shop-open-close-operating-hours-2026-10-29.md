# Shop Open/Close & Operating Hours

Already in place (checked): the four new fields exist on sellers (defaults open, 06:00–22:00, auto on), and sellers can already update their own row. No database change needed.

## 1. Shop status switch on Dashboard (top)
- Large card with a switch, similar to Swiggy/Zomato Partner.
- Green: "Shop is Open • Customers can see your products". Red/grey: "Shop is Closed • Your products are hidden from Zaago".
- Tapping saves instantly with success/failure toast.

## 2. Status banner under the switch
- Manually off: "You manually turned your shop off. Customers cannot order."
- Outside hours (auto on): "Shop is currently closed by schedule (Opens at 6:00 AM IST)." using the seller's real opening time.
- Handles overnight hours (e.g. 18:00 to 02:00). Rechecks every minute.

## 3. Operating Timings & Schedule in Settings
- Switch: "Auto open and close shop based on timings".
- Opening time and closing time pickers (default 6:00 AM / 10:00 PM).
- Save button with toast; shows a short note that times are IST.

## Technical details
- New hook `useShopStatus` (fetch seller row by user_id, toggle, save timings, `isEffectivelyOpen` IST calc via Intl Asia/Kolkata, overnight-aware). Cast through `as any` if generated types lag.
- New components `ShopStatusToggle.tsx` (switch + banner) on `Dashboard.tsx`, `OperatingHoursCard.tsx` in `Settings.tsx`.
- Times stored as `HH:MM:00`; mobile-friendly layout.
