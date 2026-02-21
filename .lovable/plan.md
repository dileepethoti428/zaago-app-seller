

# Fix Scrollbar on All Pages

## Root Cause
The current `ScrollArea` wrapping in `Layout.tsx` doesn't work because the `<main>` element uses `flex-1` which doesn't give an explicit pixel height. The `h-full` on `ScrollArea` has nothing concrete to reference, so it just grows with its content instead of constraining and scrolling.

## Solution
Two small CSS changes in `Layout.tsx` to make the height chain work:

### File: `src/components/Layout.tsx`
1. On the outer flex column div (`flex-1 flex flex-col min-w-0`), add `overflow-hidden` so it stays within the viewport
2. On the `<main>` tag, change from `flex-1 overflow-hidden` to `flex-1 overflow-hidden h-0` — the `h-0` trick forces the flex item to respect `flex-1` as a maximum rather than growing with content, giving `ScrollArea` a real height to fill

These two changes make the height chain explicit: viewport -> flex column -> main (constrained) -> ScrollArea (fills main) -> content (scrolls).

No other files need changes.

