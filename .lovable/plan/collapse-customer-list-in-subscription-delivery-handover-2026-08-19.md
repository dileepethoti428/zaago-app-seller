# Collapse customer list in Subscription Delivery Handover

The per-product customer breakdown in `AgentHandoverCard` takes too much vertical space. Collapse it behind a toggle so sellers see a compact product list and expand only the products they need to inspect.

## What changes

- In `src/components/handover/AgentHandoverCard.tsx`, replace the always-visible customer list with a "View customers" / "Hide customers" toggle per product.
- Keep the product image, name, and total quantity always visible.
- The customer list appears only when the toggle is expanded, showing each customer name and individual quantity as before.
- Default state is collapsed so the handover card is shorter and scannable.
- Keep the existing confirm/undo action button and the confirmation dialog unchanged; the dialog already lists only product totals, which matches the new compact view.

## Technical notes

- Add a local `useState` per product row or per product ID to track expanded state.
- Use the existing `Collapsible` / `CollapsibleTrigger` primitives or a small `Button`/`ChevronDown` toggle to keep UI consistent.
- No changes to `useSubscriptionHandover`, the data shape, or the Supabase RPC are needed.
- No changes to the confirmation dialog are needed unless the user wants customer details there too; keep it focused on product totals.
