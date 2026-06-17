## Add sign-out confirmation dialog

### Goal
Prevent accidental sign-outs by requiring the user to confirm before the app logs them out. This applies to both the **Sidebar** Sign Out button and the **Topbar** logout flow (if reachable), using the existing shadcn AlertDialog component.

### Implementation

1. **Create a reusable confirmation component** at `src/components/SignOutConfirmationDialog.tsx`.
   - Wraps `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction` from `src/components/ui/alert-dialog.tsx`.
   - Accepts `open`, `onOpenChange`, and `onConfirm` props.
   - Title: "Sign Out"
   - Description: "Are you sure you want to sign out?"
   - Cancel button: "Cancel"
   - Confirm button: "Sign Out" (destructive variant).

2. **Update `src/components/Sidebar.tsx`**
   - Add local state `const [showSignOutDialog, setShowSignOutDialog] = useState(false);`.
   - Change the logout button's `onClick` from `handleLogout` to `() => setShowSignOutDialog(true)`.
   - Add `<SignOutConfirmationDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog} onConfirm={handleLogout} />` after the button.
   - Leave the existing `handleLogout` implementation and error/toast logic untouched.

3. **Update `src/components/Topbar.tsx`**
   - The Topbar currently hides the logout button behind a cart/user branch. Add the same `SignOutConfirmationDialog` wired to the logout button there, if a logout action is exposed in that component; otherwise, no change.
   - If no logout button is present, the Topbar is unaffected.

4. **No backend changes** required; this is a UI-only change.

### Files changed
- `src/components/SignOutConfirmationDialog.tsx` (new)
- `src/components/Sidebar.tsx` (edit)
- `src/components/Topbar.tsx` (conditional edit)

### Validation
- After implementation, confirm the Sign Out button in the Sidebar opens a centered confirmation dialog.
- Clicking Cancel keeps the user logged in.
- Clicking Sign Out executes the existing logout flow and shows the existing toast.