
# Seller-Specific Performance Trend Analytics Implementation

## Overview

This implementation adds a comprehensive Performance Trend analytics dashboard component that provides seller-specific order metrics with interactive charts. All data is filtered at the database level to ensure complete seller isolation.

---

## Database Schema Analysis

### Orders Table (Existing)
Key columns for analytics:
- `seller_id` (UUID) - Direct seller reference
- `status` (TEXT) - Order status (placed, confirmed, out_for_delivery, delivered, cancelled, etc.)
- `total` (NUMERIC) - Order total for revenue calculation
- `created_at` (TIMESTAMPTZ) - Order creation time
- `delivered_at` (TIMESTAMPTZ) - Delivery completion time
- `delivery_date` (DATE) - Scheduled delivery date

### Existing Index
The `idx_orders_seller_id` index was already created during Top Products implementation.

---

## Implementation Plan

### Phase 1: Database - Create Secure RPC Function

Create a new PostgreSQL function `get_seller_performance_trends` that:

1. **Validates seller identity**: Checks `auth.uid() = seller_user_id` to prevent cross-seller access
2. **Accepts parameters**:
   - `seller_user_id` (UUID) - Must match auth.uid()
   - `time_range` (TEXT) - '1d', '1w', '1m', '3m', '6m', '1y'
   - `metric_type` (TEXT) - 'orders', 'revenue', 'efficiency'
3. **Returns time-series data**:
   - `period_start` (TIMESTAMPTZ)
   - `period_label` (TEXT) - Formatted date label
   - `total_orders` (INTEGER)
   - `delivered_orders` (INTEGER)
   - `failed_orders` (INTEGER)
   - `total_revenue` (NUMERIC)
   - `completion_rate` (NUMERIC)

**Aggregation Logic by Time Range:**
- 1D: Hourly aggregation (24 data points)
- 1W: Daily aggregation (7 data points)
- 1M: Daily aggregation (30 data points)
- 3M+: Weekly aggregation

**SQL Function Structure:**
```text
CREATE FUNCTION get_seller_performance_trends(
  seller_user_id UUID,
  time_range TEXT DEFAULT '1m',
  metric_type TEXT DEFAULT 'orders'
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
  
  -- Calculate start_date based on time_range
  -- Aggregate orders grouped by appropriate interval
  -- Return formatted results
END;
$$
```

### Phase 2: Create Summary RPC Function

Create `get_seller_performance_summary` for the stat cards:

**Returns:**
- `total_orders` - Count of all orders in range
- `delivered_orders` - Count of delivered orders
- `failed_orders` - Count of failed/cancelled orders
- `total_revenue` - Sum of order totals for delivered orders
- `completion_rate` - (delivered / total) * 100
- `avg_daily_orders` - total_orders / days_in_range

---

### Phase 3: React Hook - usePerformanceTrends

Create `src/hooks/usePerformanceTrends.ts`:

```text
Exports:
- usePerformanceTrends(timeRange, metricType)
  - Calls get_seller_performance_trends RPC
  - Returns { data, isLoading, error }
  
- usePerformanceSummary(timeRange)
  - Calls get_seller_performance_summary RPC
  - Returns summary stats for cards

Types:
- TimeRange = '1d' | '1w' | '1m' | '3m' | '6m' | '1y'
- MetricType = 'orders' | 'revenue' | 'efficiency'
- ChartType = 'area' | 'line' | 'stacked'
- TrendDataPoint = {
    period_start: string
    period_label: string
    total_orders: number
    delivered_orders: number
    failed_orders: number
    total_revenue: number
    completion_rate: number
  }
```

---

### Phase 4: UI Component - PerformanceTrendCard

Create `src/components/PerformanceTrendCard.tsx`:

**Layout Structure:**
```text
+-----------------------------------------------+
|  Performance Trends            [Time Filters] |
|  Track your order performance   1D 1W 1M 3M 1Y|
+-----------------------------------------------+
|  +--------+ +--------+ +--------+ +--------+  |
|  | Total  | | Compl. | | Avg    | | Deliv. |  |
|  | Volume | | Rate   | | Daily  | | Orders |  |
|  |  142   | | 94.2%  | |  4.7   | |  134   |  |
|  +--------+ +--------+ +--------+ +--------+  |
+-----------------------------------------------+
|  [Orders] [Revenue] [Efficiency]              |
+-----------------------------------------------+
|  [Area] [Line] [Stack]                        |
+-----------------------------------------------+
|                                               |
|     📈 Interactive Chart Area                 |
|     (Recharts AreaChart/LineChart)            |
|                                               |
+-----------------------------------------------+
```

**Features:**
1. **Time Range Buttons**: 1D, 1W, 1M, 3M, 6M, 1Y
2. **Summary Stat Cards**: Total Volume, Completion Rate, Avg Daily, Delivered
3. **Metric Tabs**: Orders, Revenue, Efficiency
4. **Chart Type Toggle**: Area, Line, Stacked Bar
5. **Chart**: Responsive Recharts with hover tooltips
6. **Empty State**: "No orders in selected period" with icon
7. **Loading State**: Skeleton loaders for stats and chart

**Chart Behavior by Tab:**
- **Orders Tab**: Plot total_orders per period (Y-axis: count)
- **Revenue Tab**: Plot total_revenue per period (Y-axis: ₹)
- **Efficiency Tab**: Plot completion_rate per period (Y-axis: %)

**Chart Type Behavior:**
- **Area**: Filled area chart showing cumulative trend
- **Line**: Simple line chart for point-to-point comparison
- **Stacked**: BarChart with delivered vs failed stacked

---

### Phase 5: Dashboard Integration

Update `src/pages/Dashboard.tsx`:
- Import and add `<PerformanceTrendCard />` below TopProductsCard
- Component is self-contained with its own state management

---

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/xxx_performance_trends_rpc.sql` | CREATE | RPC functions for trend data |
| `src/hooks/usePerformanceTrends.ts` | CREATE | React Query hooks for data fetching |
| `src/components/PerformanceTrendCard.tsx` | CREATE | Main UI component with charts |
| `src/pages/Dashboard.tsx` | MODIFY | Add PerformanceTrendCard |

---

## Security Implementation

| Requirement | Solution |
|-------------|----------|
| seller_id from auth session | RPC uses `auth.uid()` internally |
| Server-side enforcement | `IF auth.uid() != seller_user_id THEN RAISE EXCEPTION` |
| No frontend seller_id | Hook reads `user.id` from `useAuth()` context only |
| Cross-seller prevention | All WHERE clauses include `seller_id = seller_user_id` |

---

## Technical Details

### Recharts Components Used
- `AreaChart`, `Area` - For area charts
- `LineChart`, `Line` - For line charts  
- `BarChart`, `Bar` - For stacked bar charts
- `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`

### React Query Configuration
- `queryKey`: Includes user.id, timeRange, metricType for proper cache invalidation
- `staleTime`: 30 seconds
- `refetchInterval`: 60 seconds
- `enabled`: Only when user is authenticated

### Time Range Calculations
| Range | Start Date | Aggregation |
|-------|------------|-------------|
| 1D | NOW() - 24 hours | Hourly |
| 1W | NOW() - 7 days | Daily |
| 1M | NOW() - 30 days | Daily |
| 3M | NOW() - 90 days | Weekly |
| 6M | NOW() - 180 days | Weekly |
| 1Y | NOW() - 365 days | Monthly |

---

## Empty/Edge States

1. **No orders at all**: Show "Start selling to see your performance trends!"
2. **No orders in range**: Show "No data for selected period. Try a longer time range."
3. **Loading**: Skeleton placeholders for cards and chart area
4. **Error**: Toast notification with retry button
