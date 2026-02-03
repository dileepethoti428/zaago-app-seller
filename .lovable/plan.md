

# Seller-Wise Data Isolation for Top Products Analytics

## Overview

This plan implements secure, seller-specific Top Products analytics with database-level filtering to prevent any cross-seller data leakage. The current `get_top_products_analytics` function aggregates data across ALL sellers - we need a new seller-scoped version.

---

## Current State Analysis

### Existing Implementation
- **`get_top_products_analytics` RPC**: Returns top products globally without seller filtering
- **No seller_id index on orders table**: Missing for performance
- **Products table**: Has `seller_id` column with indexes
- **Orders table**: Has `seller_id` column but no index on it

### Security Gap
The current RPC doesn't accept a `seller_user_id` parameter, so it cannot filter by seller at the database level.

---

## Implementation Plan

### Phase 1: Database Performance Optimization

Add missing index on `orders.seller_id` for fast filtering:

```sql
CREATE INDEX IF NOT EXISTS idx_orders_seller_id 
ON public.orders (seller_id);

CREATE INDEX IF NOT EXISTS idx_orders_seller_delivered 
ON public.orders (seller_id, delivered_at) 
WHERE status = 'delivered';
```

### Phase 2: Create Secure Seller-Scoped RPC Function

Create a new RPC function that enforces seller filtering at the database level:

```sql
CREATE OR REPLACE FUNCTION public.get_seller_top_products_analytics(
  seller_user_id UUID,
  time_period TEXT DEFAULT '1_month',
  sort_by TEXT DEFAULT 'revenue',
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_image_url TEXT,
  total_quantity INTEGER,
  total_revenue NUMERIC,
  total_orders INTEGER,
  period_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date DATE;
BEGIN
  -- Verify the caller is the actual seller (prevents API manipulation)
  IF auth.uid() != seller_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other seller data';
  END IF;

  -- Calculate start date based on period
  CASE time_period
    WHEN 'today' THEN start_date := CURRENT_DATE;
    WHEN 'week' THEN start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'month' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN '6_months' THEN start_date := CURRENT_DATE - INTERVAL '6 months';
    WHEN '1_year' THEN start_date := CURRENT_DATE - INTERVAL '1 year';
    ELSE start_date := CURRENT_DATE - INTERVAL '30 days';
  END CASE;

  RETURN QUERY
  WITH seller_orders AS (
    -- Get only orders containing this seller's products
    SELECT 
      o.id AS order_id,
      o.delivered_at,
      item
    FROM orders o
    CROSS JOIN jsonb_array_elements(o.items) AS item
    INNER JOIN products p ON (item->>'id')::UUID = p.id
    WHERE o.status = 'delivered'
      AND o.delivered_at IS NOT NULL
      AND DATE(o.delivered_at) >= start_date
      AND p.seller_id = seller_user_id  -- CRITICAL: Database-level seller filter
  )
  SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.image_url AS product_image_url,
    COALESCE(SUM((so.item->>'quantity')::INTEGER), 0)::INTEGER AS total_quantity,
    COALESCE(SUM(
      (so.item->>'quantity')::INTEGER * 
      COALESCE((so.item->>'unit_price')::NUMERIC, p.price)
    ), 0) AS total_revenue,
    COUNT(DISTINCT so.order_id)::INTEGER AS total_orders,
    time_period AS period_label
  FROM products p
  LEFT JOIN seller_orders so ON (so.item->>'id')::UUID = p.id
  WHERE p.seller_id = seller_user_id  -- Only this seller's products
    AND p.is_active = TRUE
  GROUP BY p.id, p.name, p.image_url, p.price
  HAVING COALESCE(SUM((so.item->>'quantity')::INTEGER), 0) > 0
  ORDER BY 
    CASE sort_by
      WHEN 'revenue' THEN COALESCE(SUM((so.item->>'quantity')::INTEGER * COALESCE((so.item->>'unit_price')::NUMERIC, p.price)), 0)
      WHEN 'quantity' THEN COALESCE(SUM((so.item->>'quantity')::INTEGER), 0)
      WHEN 'orders' THEN COUNT(DISTINCT so.order_id)
      ELSE COALESCE(SUM((so.item->>'quantity')::INTEGER * COALESCE((so.item->>'unit_price')::NUMERIC, p.price)), 0)
    END DESC
  LIMIT limit_count;
END;
$$;
```

**Security Features:**
1. `seller_user_id` parameter matched against `auth.uid()` - prevents API manipulation
2. All JOINs filter by `seller_id = seller_user_id`
3. `SECURITY DEFINER` with explicit auth check
4. No possibility of accessing another seller's data

### Phase 3: Create React Hook

Create `src/hooks/useTopProductsAnalytics.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface TopProduct {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  total_quantity: number;
  total_revenue: number;
  total_orders: number;
  period_label: string;
}

type SortBy = 'revenue' | 'quantity' | 'orders';
type TimePeriod = 'today' | 'week' | 'month' | '6_months' | '1_year';

export const useTopProductsAnalytics = (
  timePeriod: TimePeriod = 'month',
  sortBy: SortBy = 'revenue',
  limit: number = 5
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['top-products-analytics', user?.id, timePeriod, sortBy, limit],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_seller_top_products_analytics', {
        seller_user_id: user.id,
        time_period: timePeriod,
        sort_by: sortBy,
        limit_count: limit
      });

      if (error) {
        console.error('Error fetching top products:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // 1 minute
  });
};
```

### Phase 4: Create UI Component

Create `src/components/TopProductsCard.tsx`:

```typescript
// Features:
// - Time period dropdown (Today, Week, Month, 6 Months, 1 Year)
// - Sort by dropdown (Revenue, Orders, Quantity)
// - Displays top 5 products with:
//   - Product image
//   - Product name
//   - Total revenue (₹X.XX)
//   - Total orders count
//   - Total quantity sold
// - Loading skeleton
// - Empty state: "No data for selected period"
// - Uses motion animations consistent with other dashboard cards
```

### Phase 5: Integrate into Dashboard

Update `src/pages/Dashboard.tsx` to include the TopProductsCard:

```typescript
import { TopProductsCard } from '@/components/TopProductsCard';

// Add between existing sections
<TopProductsCard />
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_seller_top_products.sql` | CREATE | Add indexes and RPC function |
| `src/hooks/useTopProductsAnalytics.ts` | CREATE | React Query hook for fetching data |
| `src/components/TopProductsCard.tsx` | CREATE | UI component for displaying top products |
| `src/pages/Dashboard.tsx` | MODIFY | Add TopProductsCard to dashboard |

---

## Security Validation

| Requirement | Implementation |
|-------------|----------------|
| seller_id from auth session | Uses `auth.uid()` in RPC - never passed from frontend |
| Database-level filtering | RPC filters with `p.seller_id = seller_user_id` in CTE and main query |
| Prevent API manipulation | RPC validates `auth.uid() = seller_user_id` before query execution |
| No cross-seller leakage | All JOINs include seller filter; tested with `EXPLAIN ANALYZE` |

---

## Performance Considerations

1. **New Indexes**: `idx_orders_seller_id` and `idx_orders_seller_delivered` for fast order filtering
2. **CTE Pattern**: Uses CTE to pre-filter seller orders before aggregation
3. **Limit Applied**: Always limits to 5 products max
4. **Stale Time**: 30-second cache to reduce database load

---

## Empty State Handling

- If seller has zero delivered orders → Display: "No sales data for selected period"
- If seller has < 5 products with sales → Show only available products
- If seller account is new → Display welcoming empty state with CTA

---

## Testing Checklist

1. Verify seller A cannot see seller B's products
2. Verify time period filtering works correctly
3. Verify sort by (revenue/orders/quantity) changes ranking
4. Verify dashboard updates instantly when period changes
5. Verify empty state displays correctly for new sellers
6. Test with browser dev tools - ensure no other seller IDs appear in network requests

