
# Seller-Side Subscription Delivery Handover Feature

## Overview

This feature provides sellers with a clear view of subscription deliveries grouped by delivery agent, showing exactly what products need to be handed over to each agent for Today or Tomorrow. It focuses exclusively on subscription orders (excluding regular one-time orders) and enforces strict seller data isolation at the database level.

---

## Database Schema Analysis

### Key Tables and Relationships

```text
daily_orders
├── id (UUID)
├── subscription_id (UUID) → subscriptions.id
├── assigned_agent_id (UUID) → delivery_agents.agent_id
├── customer_id (UUID)
├── quantity (INTEGER)
├── date (DATE)
├── status (TEXT)
└── location_id (INTEGER)

subscriptions
├── id (UUID)
├── product_id (UUID) → products.id
├── customer_id (UUID)
├── primary_agent_id (UUID)
├── quantity (INTEGER)
└── is_active (BOOLEAN)

products
├── id (UUID)
├── seller_id (UUID) ← CRITICAL: Seller filtering
├── name (TEXT)
├── unit (TEXT)
├── image_url (TEXT)
└── is_active (BOOLEAN)

delivery_agents
├── id (UUID)
├── agent_id (UUID) ← user_id reference
├── name (TEXT)
├── phone (TEXT)
└── profile_image (TEXT)
```

### Data Flow for Seller Filtering

```text
daily_orders 
  → subscription_id → subscriptions 
    → product_id → products 
      → seller_id = current_seller_id ✓
```

---

## Implementation Plan

### Phase 1: Create Secure RPC Function

Create `get_seller_subscription_handover_data`:

**Function Parameters:**
- `seller_user_id` (UUID) - Must match auth.uid()
- `handover_date` (DATE) - Today or Tomorrow

**Security:**
- Validates `auth.uid() = seller_user_id` to prevent cross-seller access
- Uses `SECURITY DEFINER` with explicit auth check
- All queries filter through `products.seller_id = seller_user_id`

**Returns:**
```text
TABLE (
  agent_id TEXT,
  agent_name TEXT,
  agent_phone TEXT,
  agent_profile_image TEXT,
  total_orders INTEGER,
  product_id UUID,
  product_name TEXT,
  product_unit TEXT,
  product_image TEXT,
  total_quantity INTEGER,
  delivery_time_slot TEXT
)
```

**Query Logic:**
1. Filter `daily_orders` by date and status IN ('pending', 'assigned', 'out_for_delivery')
2. JOIN `subscriptions` → `products` filtering by `products.seller_id = seller_user_id`
3. JOIN `delivery_agents` for agent details
4. GROUP BY agent_id, product_id to aggregate quantities
5. ORDER BY agent_name, product_name

---

### Phase 2: Create React Hook

Create `src/hooks/useSubscriptionHandover.ts`:

**Types:**
```text
HandoverAgent = {
  agentId: string
  agentName: string
  agentPhone: string
  agentProfileImage: string | null
  totalOrders: number
  products: HandoverProduct[]
  isExpanded: boolean (UI state)
}

HandoverProduct = {
  productId: string
  productName: string
  productUnit: string
  productImage: string | null
  totalQuantity: number
  deliveryTimeSlot: string | null
}

HandoverDate = 'today' | 'tomorrow'
```

**Hook Features:**
- Uses React Query with proper cache keys
- Auto-refetch every 30 seconds for live updates
- Realtime subscription for instant updates on:
  - Subscription pauses
  - Agent reassignments
  - Quantity changes
- Returns grouped data by agent → products

---

### Phase 3: Create UI Component

Create `src/components/SubscriptionHandoverCard.tsx`:

**Layout Structure:**
```text
+----------------------------------------------------------+
|  Subscription Delivery Handover    [Today ▼] [Refresh]   |
|  Hand over products to delivery agents                    |
+----------------------------------------------------------+
|  📊 3 Agents | 47 Total Orders | 🌅 Early Morning         |
+----------------------------------------------------------+
|                                                          |
|  ▼ Ramesh (+91 98765-43210)                    12 orders |
|  +------------------------------------------------------+|
|  | 🥛 Cow Milk            12 packets    ⏰ 5:30-7:00 AM  ||
|  | 🥛 Buffalo Milk         8 packets    ⏰ 5:30-7:00 AM  ||
|  | 🥤 Curd                  5 cups      ⏰ 5:30-7:00 AM  ||
|  +------------------------------------------------------+|
|                                                          |
|  ▶ Suresh (+91 98765-43211)                     8 orders |
|                                                          |
|  ▼ Mahesh (+91 98765-43212)                    27 orders |
|  +------------------------------------------------------+|
|  | 🥛 A2 Cow Milk         20 litres    ⏰ 6:00-8:00 AM  ||
|  | 🧈 Ghee                  7 bottles   ⏰ 6:00-8:00 AM  ||
|  +------------------------------------------------------+|
|                                                          |
+----------------------------------------------------------+
|  Last updated: 5:45:23 AM                                |
+----------------------------------------------------------+
```

**Features:**

1. **Date Selector Dropdown**
   - Today (default)
   - Tomorrow

2. **Summary Badges**
   - Total agents count
   - Total subscription orders
   - 🌅 "Early Morning" indicator if any delivery before 7 AM

3. **Collapsible Agent Cards**
   - Agent avatar (or initials)
   - Agent name and phone
   - Total orders badge
   - Click to expand/collapse
   - Products list when expanded:
     - Product image
     - Product name
     - Total quantity + unit
     - Delivery time slot badge

4. **Urgent Handover Highlighting**
   - Highlight agents with earliest time slots in orange/red
   - "URGENT" badge for handovers due within 1 hour

5. **Empty State**
   - Different message for "no orders today" vs "no agents assigned"

6. **Loading State**
   - Skeleton loaders for agent cards

7. **Error State**
   - Error message with retry button

---

### Phase 4: Dashboard Integration

Update `src/pages/Dashboard.tsx`:
- Import and add `<SubscriptionHandoverCard />` component
- Position after the subscription overview cards
- Self-contained with own state management

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/xxx_subscription_handover.sql` | CREATE | RPC function for handover data |
| `src/hooks/useSubscriptionHandover.ts` | CREATE | React Query hook with realtime |
| `src/components/SubscriptionHandoverCard.tsx` | CREATE | Main UI component |
| `src/pages/Dashboard.tsx` | MODIFY | Add handover card |

---

## Security Implementation

| Requirement | Solution |
|-------------|----------|
| seller_id from auth session | RPC uses `auth.uid()` internally |
| Server-side enforcement | `IF auth.uid() != seller_user_id THEN RAISE EXCEPTION` |
| No frontend seller_id passing | Hook reads `user.id` from `useAuth()` only |
| Cross-seller prevention | All WHERE clauses include seller filter via products join |
| Status filtering | Only 'pending', 'assigned', 'out_for_delivery' included |

---

## Business Logic Details

### Subscription Order Filtering

Only include orders where:
```text
1. daily_orders.date = selected_date
2. daily_orders.status IN ('pending', 'assigned', 'out_for_delivery')
3. subscriptions.is_active = TRUE
4. products.seller_id = current_seller_id
5. daily_orders.assigned_agent_id IS NOT NULL (for "assigned" view)
```

### Quantity Aggregation

For each agent + product combination:
- Sum all `daily_orders.quantity` values
- This gives total items to hand over

### Early Morning Detection

Check if any order has `delivery_time_slot` containing times before 07:00:
- Display 🌅 "Early Morning" badge
- Sort these agents first

### Urgency Calculation

For "today" view:
- If current time is within 1 hour of earliest delivery slot
- Mark that agent as "URGENT" with red highlight

---

## Live Update Strategy

### Realtime Subscriptions

Subscribe to Postgres changes on:
1. `daily_orders` table - for assignment changes
2. `subscriptions` table - for pause/skip changes

**Implementation:**
```text
supabase.channel('handover-realtime')
  .on('postgres_changes', { table: 'daily_orders' }, refetch)
  .on('postgres_changes', { table: 'subscriptions' }, refetch)
  .subscribe()
```

### Auto-Refresh

- Refetch every 30 seconds
- Immediate refetch on date change
- Manual refresh button

---

## Performance Considerations

1. **Indexed Query Path**
   - Uses existing `idx_orders_seller_id` on orders
   - daily_orders.date and daily_orders.subscription_id are indexed

2. **Aggregated Query**
   - Single RPC call with GROUP BY
   - No per-order loops
   - Pre-aggregates quantities at database level

3. **Cache Strategy**
   - Query key includes: user.id, date
   - 30-second stale time
   - Invalidate on realtime events

---

## Edge Cases

1. **No agents assigned yet**: Show empty state with message "No delivery agents assigned for [date]. Orders are waiting for assignment."

2. **Agent with 0 products**: Skip agents who have no products after seller filtering

3. **Mixed time slots**: Group products within each agent by time slot

4. **Paused subscriptions**: Excluded via `subscriptions.is_active = TRUE` check

5. **Vacation periods**: Excluded because vacation subscriptions don't generate daily_orders

---

## Technical Notes

### RPC Function SQL Structure
```text
CREATE FUNCTION get_seller_subscription_handover_data(
  seller_user_id UUID,
  handover_date DATE
)
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auth validation
  IF auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    da.agent_id,
    da.name,
    da.phone,
    da.profile_image,
    COUNT(DISTINCT do.id)::INTEGER as total_orders,
    p.id as product_id,
    p.name as product_name,
    p.unit as product_unit,
    p.image_url,
    SUM(do.quantity)::INTEGER as total_quantity,
    s.delivery_time_slot
  FROM daily_orders do
  INNER JOIN subscriptions s ON do.subscription_id = s.id
  INNER JOIN products p ON s.product_id = p.id
  INNER JOIN delivery_agents da ON do.assigned_agent_id = da.agent_id
  WHERE do.date = handover_date
    AND do.status IN ('pending', 'assigned', 'out_for_delivery')
    AND p.seller_id = seller_user_id  -- CRITICAL: Seller filter
    AND s.is_active = TRUE
  GROUP BY 
    da.agent_id, da.name, da.phone, da.profile_image,
    p.id, p.name, p.unit, p.image_url, s.delivery_time_slot
  ORDER BY da.name, p.name;
END;
$$;
```

### React Query Configuration
```text
queryKey: ['subscription-handover', user?.id, selectedDate]
staleTime: 30000 (30 seconds)
refetchInterval: 30000 (30 seconds)
enabled: !!user?.id
```
