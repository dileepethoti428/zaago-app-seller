# Add Delivery Partner Details in COD Settlement Sheet

Show the partner's contact and team info inside the COD detail sheet so you can quickly call them when money isn't settled.

## What you'll see

When you tap a partner in COD Settlements, the top of the detail sheet will show:

- **Profile + name** (as today)
- **Phone number** with a green "Call" button — tap dials directly
- **Online / Offline badge** next to the name (live status)
- **Vehicle**: type + number (e.g. "Bike • TS09 AB 1234")
- **Joined date**: "Partner since 12 Mar 2024"
- **Total deliveries**: lifetime completed count
- A small helper line: *"Not settled? Tap call to follow up."*

Below that, the Pending / Settled summary and order list stay exactly as they are today.

## Layout sketch

```text
┌────────────────────────────────────────┐
│ [avatar] Ramesh Kumar     ● Online     │
│          COD Order History             │
│                                        │
│ 📞 +91 98xxx xxxxx        [ Call ]     │
│ 🛵 Bike • TS09 AB 1234                 │
│ 📅 Partner since 12 Mar 2024           │
│ 📦 348 deliveries completed            │
│ ─────────────────────────────────────  │
│ [Pending ₹420]   [Settled ₹1,200]      │
│ ...order list...                       │
└────────────────────────────────────────┘
```

## Technical notes

- **No DB changes.** All fields already exist on `delivery_agents` (`phone`, `vehicle_type`, `vehicle_number`, `is_online`, `created_at`) and lifetime deliveries can come from a count of `delivery_history` for that agent, or an existing aggregate column if present (will verify on implementation).
- **`AgentCodDetailDialog.tsx`**: accept new props (`phone`, `vehicleType`, `vehicleNumber`, `isOnline`, `joinedAt`, `totalDeliveries`) and render the new header block. Call button uses `<a href="tel:...">`.
- **`CodSettlements.tsx`**: extend the agent fetch in `useCodSettlements` to also pull `phone, vehicle_type, vehicle_number, is_online, created_at`, expose them in `AgentSettlement`, and pass through `selectedAgent` to the dialog.
- **`useCodSettlements.ts`**: widen the `delivery_agents` select; add a lightweight `delivery_history` count query (or reuse an existing count field) keyed by agent id for the selected partner only — fetched inside the dialog to avoid loading counts for every row.
- Online badge: green dot if `is_online = true`, grey "Offline" otherwise.
- Missing phone → show "No phone on file" and disable the Call button.

## Out of scope

- No changes to the list card.
- No SMS / WhatsApp action (only tap-to-dial).
- No changes to settle / order list behavior.