## Fix Cost Edit Overflowing on Mobile (Products page)

### Problem

On mobile (viewport ~847px down to ~360px), tapping **Cost → Pencil** opens an inline editor inside a single rounded pill containing:

`EyeOff` + `Cost: ₹` + `<Input w-24>` + `Check` + `X`

The pill itself sits in a row with `flex items-center gap-2 flex-wrap`, but everything inside the inner pill is on **one non-wrapping line** (`inline-flex` with no wrap). On a phone the input alone (`w-24` = 96px) plus the label and the two icons exceeds the row width, so:

- The pill overflows the card's right edge.
- The card row uses `overflow-hidden` (rounded list container) and the inner row has no horizontal scroll, so the **Check (✓) tick is clipped off-screen**.
- There's nothing to scroll horizontally, so the user can't reach Save.

### Fix

Make the editor wrap and stay within the row on small screens. Specifically, in `src/pages/Products.tsx` around lines 700–774:

1. Allow the inner editor pill to wrap:
   - Change the inner container from `inline-flex items-center gap-2 ...` to `inline-flex flex-wrap items-center gap-2 max-w-full`.
2. Make the editing fragment a self-contained wrap group that is full-width on mobile so the action buttons drop to a second line if needed:
   - Wrap the editing JSX (`Cost: ₹` + `Input` + `Check` + `X`) in a `<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">`.
   - Reduce the input width so label + input fit on one mobile line: `w-20 sm:w-24`.
3. Make Save/Cancel touch-friendly (currently 14px icons with no padding — easy to miss-tap):
   - Wrap each action icon in a button with `p-1 -m-1` and `min-w-[32px] min-h-[32px] inline-flex items-center justify-center`, and bump the icon to `w-4 h-4`.
   - Keep the green Save color; ensure it isn't clipped by setting `flex-shrink-0` on each action button.
4. Prevent the outer card row from clipping the editor:
   - The list container (`rounded-xl overflow-hidden` on the section) is fine, but each row uses `flex items-center gap-6 p-6` — on mobile the `gap-6` + `p-6` leaves very little width. No structural change needed; the wrapping above resolves it. Keep `min-w-0` on the details column (already present).

### Files changed

- `src/pages/Products.tsx` — only the cost-edit JSX block (lines ~700–774). No logic, state, or DB changes.

### Why this is safe

- Pure presentational change scoped to one block.
- Desktop layout unchanged (`sm:w-auto`, `sm:w-24` restore current sizing at ≥640px).
- Save/Cancel handlers, `saveCost`, `cancelEditCost`, and `costInput` state are untouched.
