

# Sales Report Improvements

## Changes Overview

Two fixes:

### 1. Remove Customer Column, Focus on Product Data

The sales report will be restructured to help sellers understand **what products sold and how much**, removing customer names entirely.

**On-screen table columns**: Date, Order ID, Product, Qty, Unit Price, Total

**Additionally**, add a **Product Summary** section at the top that aggregates totals by product name -- this helps sellers predict future demand:

```text
+------------------------------------------+
| Product Summary                          |
|------------------------------------------|
| Product         | Qty Sold | Revenue     |
| Cow Milk        |    120   | Rs.8,400    |
| Curd            |     85   | Rs.4,250    |
| Paneer          |     45   | Rs.6,750    |
+------------------------------------------+
```

### 2. Fix Rupee Symbol in PDF

jsPDF's default font does not support the `₹` character, which is why it renders as `1`. The fix is to replace all `₹` with `Rs.` in the PDF export, which works reliably with the default font.

## Files to Change

| File | Changes |
|------|---------|
| `src/hooks/useSalesReport.ts` | Remove `customerName` from the interface and query mapping |
| `src/pages/SalesReport.tsx` | Remove Customer column from table; add a Product Summary card showing aggregated qty and revenue per product |
| `src/utils/salesReportExport.ts` | Remove Customer column from PDF table; replace all `₹` with `Rs.` in summary text and table cells; remove customer from header row |

