

# Fix: Blank Screen on "View Details" in Subscriptions

## Problem
The `CompensationAssignmentDialog` component is always rendered (mounted) whenever `subscriptionInfo` exists in `CustomerDetailsDialog`, even when the compensation dialog is closed and `missedDate` is an empty string. This causes `format(new Date(''), ...)` to throw `RangeError: Invalid time value`.

The previous fix only guarded the `DialogDescription` line, but the component still mounts and Radix Dialog can pre-render content.

## Solution
Two changes to fully prevent the error:

### 1. Guard rendering of `CompensationAssignmentDialog` in `CustomerDetailsDialog.tsx`
Only render the component when `compensationDialog.open` is true AND `missedDate` is not empty:

```tsx
// Before (line ~127):
{subscriptionInfo && (
  <CompensationAssignmentDialog ... />
)}

// After:
{subscriptionInfo && compensationDialog.open && compensationDialog.missedDate && (
  <CompensationAssignmentDialog ... />
)}
```

### 2. Add early return guard in `CompensationAssignmentDialog.tsx`
As a safety net, return null if the dialog is not open or missedDate is invalid:

```tsx
// Add at the top of the component, before any format() calls:
if (!open || !missedDate) return null;
```

## Files to Change

| File | Change |
|------|--------|
| `src/components/CustomerDetailsDialog.tsx` | Conditionally render CompensationAssignmentDialog only when open and missedDate is valid |
| `src/components/CompensationAssignmentDialog.tsx` | Add early return guard before any date formatting |

