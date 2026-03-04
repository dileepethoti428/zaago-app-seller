

# Add Scrollbar to Pending Compensation Deliveries

## Change
Wrap the pending compensations list (lines 632-635) in a scrollable container with a max height, so when there are many items (like 69), the section doesn't stretch the entire page.

### File: `src/pages/VacationCompensations.tsx`

**Line 632**: Change the `div` wrapping the pending list to have `max-h-[600px] overflow-y-auto` so it becomes scrollable after ~4-5 cards, keeping the page manageable.

