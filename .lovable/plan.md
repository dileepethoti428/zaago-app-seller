## Change

Append the subscription quantity as `x{n}` after the product name+unit in both places where it's shown, e.g. `Onion 500g x2`.

## Files

1. **`src/pages/Subscriptions.tsx`** (subscription list card, ~line 692)
   Replace:
   ```
   {subscription.products?.name || 'Unknown Product'}
   {subscription.products?.unit ? ` ${subscription.products.unit}` : ''}
   ```
   with the same text plus ` x{subscription.quantity}` appended (only when quantity is set; default to 1).

2. **`src/components/CustomerDetailsDialog.tsx`** (Details tab Product row, ~line 169-170)
   Same treatment: append ` x{subscriptionInfo.quantity ?? 1}` after the unit.

No type or data changes — `quantity` is already on `subscriptions` and already passed through `SubscriptionInfo`.
