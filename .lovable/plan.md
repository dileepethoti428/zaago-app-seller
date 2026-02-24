
# Fix Horizontal Scrolling Inside Pages

## Root Cause
The Radix ScrollArea component that handles vertical scrolling for the layout has two behaviors that kill horizontal scrolling inside pages:

1. **The viewport sets `overflow-x: hidden`** (inline style) because we only render a vertical scrollbar. This clips all horizontal overflow.
2. **The content wrapper uses `display: table`** (inline style), which makes the inner content expand to fit children's intrinsic widths instead of constraining them.

Together, these prevent any `overflow-x-auto` inside pages from working -- the content either expands beyond the viewport (table layout) or gets clipped (overflow-x hidden).

## Solution
Modify the `ScrollArea` component to allow controlling overflow behavior, then use native scrolling in the Layout instead.

### Option chosen: Replace ScrollArea with native overflow in Layout

Since we only need vertical scrolling in the layout (not a custom styled scrollbar), the simplest fix is to replace `ScrollArea` with a plain `div` that has `overflow-y: auto` and `overflow-x: hidden`. This avoids Radix's viewport restrictions entirely while keeping the vertical scroll behavior.

### Changes

**File 1: `src/components/Layout.tsx`**
- Remove the `ScrollArea` import
- Replace `<ScrollArea className="h-full">` with `<div className="h-full overflow-y-auto overflow-x-hidden">`
- This keeps vertical scrolling working (as confirmed by user) while no longer blocking horizontal scrolling inside child pages

**No other files need changes.** The `overflow-x-auto` wrappers already added to DeliveryAgents, UnassignedOrders, Subscriptions, and Products pages will start working once the parent stops clipping horizontal overflow.

### Why this is safe
- The only thing we lose is the thin custom-styled Radix scrollbar thumb -- the browser's native scrollbar will show instead
- All horizontal scroll sections will immediately work
- Vertical scrolling continues to work exactly as before
