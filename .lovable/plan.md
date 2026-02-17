

# Simplify Sales Report: Product Summary Only

## What Changes

Remove the detailed "Sold Items" table entirely -- both on-screen and in the PDF. Keep only the **Product Summary** table that shows aggregated data per product (Product Name, Qty Sold, Revenue). This is the useful view for predicting what to stock.

### On-Screen (SalesReport.tsx)
- Remove the entire "Sold Items" card (lines 167-215) that shows Date, Order ID, Product, Qty, Unit Price, Total per row
- Keep: date filters, summary cards (Total Items, Quantity Sold, Total Revenue), and Product Summary table

### PDF Export (salesReportExport.ts)
- Remove the detailed items table (lines 52-70) that lists every individual order line
- Keep: title, date range, summary stats, and the Product Summary table only

### Files to Change

| File | Change |
|------|--------|
| `src/pages/SalesReport.tsx` | Delete the "Sold Items" detailed table card (lines 167-215) |
| `src/utils/salesReportExport.ts` | Delete the detailed items table section (lines 52-70) |

No changes needed to the hook or data fetching -- only the display is being simplified.

