
Fix plan: blank screens are still being caused by leaked Supabase realtime channels, not by the `notifications.body` database fix itself.

Do I know what the issue is? Yes.

Clarification
- No user clarification is needed here because the crash path is visible in the code.

Root cause
1. Several pages create realtime subscriptions inside helper functions that return a cleanup callback, but the surrounding `useEffect` does not return that cleanup. So the old channel stays alive after navigation.
2. Those stale channels use static names. When you revisit the page, or move between pages sharing the same channel name, Supabase tries to add new `postgres_changes` handlers to an already-subscribed channel and throws the runtime error that blanks the page.
3. This exactly matches your edit-product flow:
   - open `Products`
   - go to `EditProduct`
   - save quantity
   - app navigates back to `/products`
   - old `products-realtime` channel is still alive
   - `Products.tsx` subscribes again with the same name
   - app crashes to a blank screen
4. There is also a cross-page collision already in the code: `Orders.tsx` and `Deliveries.tsx` both use the same static channel name `seller-orders-realtime`, so clicking between those pages can crash too.

Files with the bad subscription lifecycle
- `src/pages/Products.tsx`
- `src/pages/Orders.tsx`
- `src/pages/Payments.tsx`
- `src/pages/OrderDetail.tsx`
- `src/pages/DeliveryAgent.tsx`

Files that should also be hardened so this does not come back elsewhere
- `src/pages/Deliveries.tsx`
- `src/pages/Subscriptions.tsx`
- `src/pages/CustomerOrders.tsx`
- `src/hooks/useSubscriptionHandover.ts`
- `src/hooks/useHandoverConfirmation.ts`
- `src/components/SubscriptionOrderCard.tsx`

Implementation plan
1. Fix the leaking pages first
   - Change each affected `useEffect` so it captures and returns the cleanup from the realtime setup function.
   - If easier, inline channel creation directly inside the `useEffect` and return cleanup there.
   - This is the main fix for the edit-product blank screen.

2. Remove static channel-name collisions
   - Replace remaining static channel names with unique names per mount, using a consistent pattern such as `prefix-userId-timestamp` or a small helper.
   - Especially fix duplicated names like `seller-orders-realtime`.

3. Standardize the realtime pattern across the app
   - Use one safe pattern everywhere:
     - create channel
     - attach all `.on(...)` handlers
     - call `.subscribe()`
     - return cleanup from the same effect
   - Do not keep helper functions that return cleanup if the caller forgets to return it.

4. Add one safety net
   - Wrap the routed app content in an error boundary so a single runtime subscription failure cannot white-screen the entire app again.
   - This does not replace the real fix, but it prevents total app failure.

5. Verify the exact broken flows
   - `Products` -> edit product -> update quantity -> save -> return to products
   - `Orders` -> `Deliveries` -> back
   - reopen `Payments`
   - open/close `OrderDetail`
   - revisit `DeliveryAgent`

Technical details
- The earlier `null value in column body` issue was a separate database problem and its fix can stay.
- What changed after that fix is that the save now completes, so navigation returns to pages whose old realtime channels were never cleaned up.
- No new database migration is needed for this blank-screen problem; this is a frontend realtime lifecycle issue.

Expected result after implementation
- Updating quantity from Edit Product will return to the Products page without a blank screen.
- Route changes between orders/deliveries/payment pages will stop crashing.
- Realtime will continue working, but without stale channel buildup.
