

## Add "View Delivery Partner" to Orders Page

### Problem
After a delivery partner accepts an order, the seller has no way to see the partner's details (name, phone, vehicle number) on the Orders page.

### Solution
Add a "View Delivery Partner" button on each order card for orders with status `assigned`, `in_transit`, or `delivered`. Clicking it opens a dialog showing the agent's name, phone (with call link), and vehicle number.

### Implementation

#### 1. Add agent info fetching (`src/pages/CustomerOrders.tsx`)

The `get_seller_specific_orders` RPC doesn't return agent details. After mapping orders, do a separate query to fetch agent info for orders that have an `assigned_agent_id`:

- Extend the `Order` interface to include `assigned_agent_id` and optional `agent_name`, `agent_phone`, `agent_vehicle_number`, `agent_profile_image`
- The RPC result likely includes `assigned_agent_id` — map it in `mappedOrders`
- After fetching orders, collect all non-null `assigned_agent_id` values, query `delivery_agents` table for those IDs (selecting `name`, `phone`, `vehicle_number`, `vehicle_type`, `profile_image`), and merge agent data into the orders state

#### 2. Add Delivery Partner dialog

Create a simple inline dialog/sheet in `CustomerOrders.tsx`:
- State: `selectedAgentOrder` (the order whose agent to show)
- Dialog content: Agent name, phone (clickable `tel:` link), vehicle number, vehicle type
- Styled consistently with the dark theme

#### 3. Add "View Delivery Partner" button on order cards

For orders with status `assigned`, `in_transit`, or `delivered` that have agent data:
- Add a button next to the existing "View Details" button (around line 695-716)
- Button text: "View Delivery Partner" with a `Truck` icon
- On click: opens the agent details dialog

### Files Changed
- `src/pages/CustomerOrders.tsx` — extend Order interface, fetch agent data, add dialog + button

