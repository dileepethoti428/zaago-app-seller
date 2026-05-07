## Add Product Details to Customer Lookup

### Change

In `src/components/CustomerLookupDialog.tsx`, add a new collapsible **"Products Ordered"** card (between Order Information and Delivery Status) that lists every item in `result.order_info.items`.

The `items` JSON is already returned by `lookup_order_by_tracking_id` — no DB or hook changes needed.

### Card content (per item)

- Product image (`image_url`, fallback to a Package icon placeholder)
- Product name
- Unit (e.g., "per piece") + quantity badge (e.g., "× 2")
- Unit price (`₹{price}`) and line total (`₹{price * quantity}`)
- If present: category name, discount % badge, GST % badge

Footer of the card shows item count and items subtotal.

### Layout

```
┌─ Products Ordered (N items) ──────────── ▼ ┐
│ [img] Vegetables                            │
│       per piece · ×1                        │
│       ₹10  •  Total ₹10   [GST 0%] [-3%]    │
│ ─────────────────────────────────────────── │
│ [img] Coffee Powder                         │
│       per piece · ×1                        │
│       ₹200 •  Total ₹200                    │
│ ─────────────────────────────────────────── │
│ Subtotal: ₹210                              │
└─────────────────────────────────────────────┘
```

Mobile-friendly: image 48x48, text wraps, price right-aligned on sm+ screens, stacked on mobile.

### Files

- `src/components/CustomerLookupDialog.tsx` — add the new Collapsible/Card block; render `result.order_info.items` as an array (handle missing/empty gracefully with a "No items" note).

No type, hook, or backend changes.
