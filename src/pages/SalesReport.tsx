import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, subMonths, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Calendar, Package } from 'lucide-react';
import { useSalesReport } from '@/hooks/useSalesReport';
import { exportSalesReportPDF } from '@/utils/salesReportExport';
import { getCurrentISTTime } from '@/utils/timeZone';

const presetFilters = [
  { label: 'Today', getValue: () => { const t = format(getCurrentISTTime(), 'yyyy-MM-dd'); return { start: t, end: t }; } },
  { label: '1 Day Ago', getValue: () => { const d = format(subDays(getCurrentISTTime(), 1), 'yyyy-MM-dd'); return { start: d, end: d }; } },
  { label: '1 Week', getValue: () => ({ start: format(subDays(getCurrentISTTime(), 7), 'yyyy-MM-dd'), end: format(getCurrentISTTime(), 'yyyy-MM-dd') }) },
  { label: '15 Days', getValue: () => ({ start: format(subDays(getCurrentISTTime(), 15), 'yyyy-MM-dd'), end: format(getCurrentISTTime(), 'yyyy-MM-dd') }) },
  { label: '1 Month', getValue: () => ({ start: format(subMonths(getCurrentISTTime(), 1), 'yyyy-MM-dd'), end: format(getCurrentISTTime(), 'yyyy-MM-dd') }) },
  { label: '6 Months', getValue: () => ({ start: format(subMonths(getCurrentISTTime(), 6), 'yyyy-MM-dd'), end: format(getCurrentISTTime(), 'yyyy-MM-dd') }) },
  { label: 'All Time', getValue: () => ({ start: null as string | null, end: null as string | null }) },
];

export default function SalesReport() {
  const [activePreset, setActivePreset] = useState(0);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const dateRange = useMemo(() => {
    if (useCustom && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return presetFilters[activePreset].getValue();
  }, [activePreset, useCustom, customStart, customEnd]);

  const { data: items, isLoading } = useSalesReport(dateRange.start, dateRange.end);

  const totalRevenue = useMemo(() => (items || []).reduce((s, i) => s + i.total, 0), [items]);
  const totalQty = useMemo(() => (items || []).reduce((s, i) => s + i.quantity, 0), [items]);

  const dateRangeLabel = useCustom
    ? `${customStart} to ${customEnd}`
    : presetFilters[activePreset].label;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            Sales Report
          </h1>
          <p className="text-muted-foreground">View and export your sold items</p>
        </div>
        <Button
          onClick={() => items && exportSalesReportPDF(items, dateRangeLabel)}
          disabled={!items || items.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {presetFilters.map((filter, i) => (
              <Button
                key={filter.label}
                size="sm"
                variant={!useCustom && activePreset === i ? 'default' : 'outline'}
                onClick={() => { setActivePreset(i); setUseCustom(false); }}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <span className="text-sm text-muted-foreground">Custom Range:</span>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setUseCustom(true); }}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setUseCustom(true); }}
              className="w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{items?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{totalQty}</p>
            <p className="text-sm text-muted-foreground">Quantity Sold</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-primary">₹{totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Summary */}
      {items && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    (items || []).reduce<Record<string, { qty: number; revenue: number }>>((acc, item) => {
                      const name = item.productName || 'Unknown';
                      if (!acc[name]) acc[name] = { qty: 0, revenue: 0 };
                      acc[name].qty += item.quantity;
                      acc[name].revenue += item.total;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([name, data]) => (
                      <TableRow key={name}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell className="text-right">{data.qty}</TableCell>
                        <TableCell className="text-right font-medium">₹{data.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sold Items ({dateRangeLabel})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !items || items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sold items found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={`${item.orderId}-${idx}`}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(item.date), 'dd MMM yy')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.orderId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{item.productName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
