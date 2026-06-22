## Goal

In the "Mark Agent Absent Today?" dialog, add an optional way to bulk-transfer all of the absent partner's today's orders to another available delivery partner — so you don't have to reassign 30 orders one by one from the Unassigned Orders page.

## UX

Update `MarkAgentAbsentDialog` to include, when `ordersToday > 0`:

- A checkbox: **"Transfer today's orders to another partner"** (off by default — keeps current behavior).
- When checked, reveal a dropdown labeled **"Replacement partner"** listing all currently online, active delivery partners (excluding the absent one) in the seller's location.
- The primary CTA changes contextually:
  - Unchecked → **Mark Absent** (orders go to Unassigned, as today).
  - Checked + partner selected → **Mark Absent & Transfer**.
  - Checked + no partner picked → button disabled.
- Subscription primary agent is **not** changed — only today's `daily_orders` rows move. The absent partner remains the subscription's primary agent and will resume tomorrow when back online.

## Data changes

No schema changes. Reuse existing tables:

- `delivery_agents` (filter `is_active = true`, `is_online = true`, same `location_id` as absent agent, `id != absentAgent.id`) for the dropdown.
- `daily_orders` — update `assigned_agent_id` from absent agent's user id to replacement's user id for `date = today`.

## Implementation

1. **`src/hooks/useAgentAbsence.tsx`** — extend `useMarkAgentAbsent` to accept an optional `replacementAgentUserId`. Flow:
   - Set absent agent `is_online = false`.
   - If `replacementAgentUserId` provided → `UPDATE daily_orders SET assigned_agent_id = replacement WHERE assigned_agent_id = absent AND date = today`.
   - Else → existing behavior (`assigned_agent_id = null`).
   - Toast copy adapts: "Transferred N orders to {name}" vs current "orders unassigned".
   - Invalidate the same query keys already listed plus `['delivery-agents-list']`.

2. **New hook `useOnlineAgentsForTransfer(locationId, excludeAgentId)`** in `src/hooks/useAgentAbsence.tsx` (or co-located) — selects `id, user_id, name` from `delivery_agents` where active, online, same location, excluding the absent agent.

3. **`src/components/MarkAgentAbsentDialog.tsx`** — add props: `absentAgentLocationId`, `absentAgentId`, and change `onConfirm` to `onConfirm(replacementUserId: string | null)`. Add the checkbox + Select (shadcn `Select`) UI described above. Disable confirm when checkbox is on and no partner picked. Hide the existing "manually reassign from Unassigned Orders page" hint when transfer is enabled.

4. **`src/pages/DeliveryAgents.tsx`** — pass the new props and forward the chosen replacement id into the mutation call.

## Edge cases

- Zero online partners available → checkbox is disabled with helper text "No other partners online right now".
- If `ordersToday === 0` → don't show the checkbox at all (current dialog body shrinks as today).
- Replacement partner is the same agent → guarded by excluding `absentAgent.id` from the list.
- Mutation is atomic from the user's perspective: agent is set offline first; if the bulk update fails, surface the error and keep the agent offline (matches current behavior where order-update failure already throws).

## Out of scope

- Permanently changing each subscription's primary agent (user chose "today's orders only").
- Showing capacity counts in the dropdown (user chose plain dropdown).
- Tomorrow's orders / multi-day absence — only today's `daily_orders` are touched.
