

## Extend Order Cancellation Window to Include Out-for-Delivery

Update the previously approved cancellation feature so sellers can also cancel an order **after** it has been handed to the delivery partner — not just while it's `accepted` or `packed`.

### Updated cancellation window

Cancel button is shown when order status is one of:
- `accepted`
- `packed`
- `assigned` (delivery partner assigned but not picked up)
- `out_for_delivery` (handed to / picked up by delivery partner)

Cancel button is **hidden** once status is:
- `delivered`, `cancelled`, `rejected`, `returned`

### Extra behavior for late-stage cancellation

When cancelling an order that's already `assigned` or `out_for_delivery`:
- The assigned delivery partner gets a **high-priority push notification**: "Order cancelled by seller — please return the parcel" along with the reason.
- Order is flagged with `requires_partner_return = true` so ops can track parcels that need to come back.
- An `admin_notifications` row is inserted (type `late_cancellation`) so the ops team is alerted, similar to the existing late-acceptance flow.
- Stock is still restored.
- Customer gets the cancellation notification with reason.

### Reason picker (unchanged from prior plan)

- Customer requested cancellation
- Out of stock
- Unable to fulfill
- Other (free text)

Reason remains required.

### Backend changes (delta from prior plan)

- `cancel_accepted_order` RPC accepts statuses: `accepted`, `packed`, `assigned`, `out_for_delivery` (was only `accepted`, `packed`).
- RPC detects late-stage cancellation (`assigned` / `out_for_delivery`) and:
  - Notifies the assigned delivery partner
  - Inserts `admin_notifications` row
  - Sets `requires_partner_return = true`
- Migration adds `requires_partner_return boolean default false` to `orders` (in addition to the cancellation columns from the prior plan).

### Frontend changes (delta)

- `src/pages/Orders.tsx` and `src/pages/OrderDetail.tsx`: extend the visibility condition for the Cancel button to include `assigned` and `out_for_delivery`.
- `CancelOrderDialog.tsx`: when status is `assigned` or `out_for_delivery`, show an amber warning banner: *"This order has already been handed to the delivery partner. Cancelling will notify them to return the parcel."* — so sellers don't cancel late-stage orders casually.

### Files changed

- `supabase/migrations/<new>.sql` — cancellation columns + `requires_partner_return` + updated RPC accepting wider status set + ops notification logic
- `src/hooks/useSellerOrderActions.tsx` — `cancelAcceptedOrder` (unchanged signature)
- `src/components/CancelOrderDialog.tsx` — adds late-stage warning banner
- `src/pages/Orders.tsx` — wider visibility condition for Cancel button
- `src/pages/OrderDetail.tsx` — wider visibility condition for Cancel button

