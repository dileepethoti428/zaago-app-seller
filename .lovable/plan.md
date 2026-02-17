
# Fix: Product Names Missing in Sales Report

## Root Cause

The sales report query joins with the `order_items` table, but that table is essentially empty (only 1 row). Your order data stores items as a **JSONB array** inside the `orders.items` column. Each item in that array has fields like `name`, `price`, `quantity`.

This is why everything shows as "N/A" -- the query finds no `order_items` rows, so it falls back to the "no items" branch.

## Fix

Update `src/hooks/useSalesReport.ts` to:
- Stop querying `order_items` and `products` tables
- Instead, select `orders.items` (the JSONB column)
- Parse each item from the JSONB array to extract `name`, `price`, and `quantity`

The PDF export file (`salesReportExport.ts`) is already correct and needs no changes -- the format matches exactly what you want. Once the data feeds in properly, product names will appear correctly in both the on-screen table and the PDF.

## Technical Details

### File: `src/hooks/useSalesReport.ts`

**Current query** (broken):
```
.select(`id, created_at, total, status, customer_name,
  order_items ( product_id, quantity, unit_price, total_price, products (name) )`)
```

**New query**:
```
.select(`id, created_at, total, status, items`)
```

**New mapping logic**: Parse `order.items` (JSONB array) where each element has:
- `name` -- the product name
- `price` -- the unit price
- `quantity` -- quantity ordered

Calculate `total` as `price * quantity` for each item. This will populate the Product Summary table in the PDF with actual product names and quantities.
