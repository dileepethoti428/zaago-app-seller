## Move Cost Edit into a Popup Dialog

### Problem

The inline cost editor in the product row looks cramped and breaks layout on mobile. Replace it with a clean popup so editing happens in a focused dialog with proper Save and Close buttons.

### Change

In `src/pages/Products.tsx`:

1. **Replace the inline reveal/edit block (lines ~681–775)** with a single small "Cost" pill button per product row:
   - Shows `Eye` + "Cost" + `Pencil` + `Lock` icons (no value visible until opened — keeps it private).
   - Clicking the pill opens a dialog (does not navigate to product detail; uses `e.stopPropagation()`).

2. **Add a single shared `Dialog`** at the bottom of the component (just before the final `</motion.div>`) controlled by existing `editingCostId` / `costInput` state:
   - Title: "Edit Cost Price" with a `Lock` icon and an "Internal — only visible to you" subtitle.
   - Body: shows the product name, current saved cost (`₹{cost_price}` or "Not set"), and a labelled number `Input` for the new value with `₹` prefix.
   - Footer: `Cancel` (outline) and `Save` (zaago-green) buttons. Save calls existing `saveCost(editingCostId)`; Cancel calls `cancelEditCost()`. Save shows a spinner / disabled state when `savingCostId === editingCostId`.
   - Dialog `open` is `editingCostId !== null`; `onOpenChange(false)` calls `cancelEditCost()`. Built-in `DialogContent` close (X) button serves as the exit button.
   - Enter key in the input triggers Save.

3. **Remove now-unused state**: `revealedCostIds`, `toggleCostReveal`, and the `Eye`/`EyeOff`/`Check` icon usages tied to the inline editor. Keep `Eye`, `Pencil`, `Lock` for the pill button.

### Files changed

- `src/pages/Products.tsx` — only the cost UI block and a new dialog at the bottom. No DB / hook / logic changes; reuses existing `startEditCost`, `cancelEditCost`, `saveCost`, `editingCostId`, `costInput`, `savingCostId`.

### Why this is safe

- No schema or query changes.
- All write paths (`saveCost`) are unchanged.
- Dialog is mobile-friendly by default (full-width on small screens via shadcn's `DialogContent`), so no overflow/scroll issues.
