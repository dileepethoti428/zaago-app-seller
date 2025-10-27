import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, Package, User, Store, Truck, Loader2 } from 'lucide-react';
import { useCustomerLookup } from '@/hooks/useCustomerLookup';
import { format } from 'date-fns';

export const CustomerLookupDialog = () => {
  const [open, setOpen] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const { loading, result, error, lookupOrder, reset } = useCustomerLookup();

  const handleSearch = () => {
    lookupOrder(trackingId);
  };

  const handleClose = () => {
    setOpen(false);
    setTrackingId('');
    reset();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-purple-500',
      ready: 'bg-cyan-500',
      picked: 'bg-indigo-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-auto flex-col items-start p-6 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-2">
            <Search className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Customer Lookup</span>
          </div>
          <p className="text-sm text-muted-foreground">Track orders by ID</p>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Lookup</DialogTitle>
          <DialogDescription>
            Enter a tracking ID to view complete order, customer, seller, and delivery agent details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="tracking-id">Tracking ID</Label>
              <Input
                id="tracking-id"
                placeholder="e.g., ZG-20251022-009C"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4 mt-6">
              {/* Order Information */}
              <Collapsible defaultOpen>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Order Information
                      </CardTitle>
                      <ChevronDown className="h-5 w-5" />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Tracking ID</p>
                          <p className="font-medium">{result.order_info.tracking_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className={getStatusColor(result.order_info.status)}>
                            {result.order_info.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="font-medium">₹{result.order_info.total_amount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Method</p>
                          <p className="font-medium">{result.order_info.payment_method}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Status</p>
                          <p className="font-medium">{result.order_info.payment_status}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Created At</p>
                          <p className="font-medium">
                            {format(new Date(result.order_info.created_at), 'PPp')}
                          </p>
                        </div>
                        {result.order_info.delivery_date && (
                          <div>
                            <p className="text-sm text-muted-foreground">Delivery Date</p>
                            <p className="font-medium">
                              {format(new Date(result.order_info.delivery_date), 'PP')}
                            </p>
                          </div>
                        )}
                        {result.order_info.delivery_time_slot && (
                          <div>
                            <p className="text-sm text-muted-foreground">Time Slot</p>
                            <p className="font-medium">{result.order_info.delivery_time_slot}</p>
                          </div>
                        )}
                      </div>
                      {result.order_info.special_instructions && (
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground">Special Instructions</p>
                          <p className="font-medium">{result.order_info.special_instructions}</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Customer Information */}
              <Collapsible defaultOpen>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Customer Details
                      </CardTitle>
                      <ChevronDown className="h-5 w-5" />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{result.customer_info.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{result.customer_info.phone}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Delivery Address</p>
                        <p className="font-medium">
                          {typeof result.customer_info.delivery_address === 'object'
                            ? result.customer_info.delivery_address?.formatted_address ||
                              JSON.stringify(result.customer_info.delivery_address)
                            : result.customer_info.delivery_address}
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Seller Information */}
              <Collapsible defaultOpen>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                      <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        Seller Details
                      </CardTitle>
                      <ChevronDown className="h-5 w-5" />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{result.seller_info.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{result.seller_info.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{result.seller_info.email}</p>
                        </div>
                      </div>
                      {result.seller_info.pickup_address && (
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground">Pickup Address</p>
                          <p className="font-medium">{result.seller_info.pickup_address}</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Delivery Agent Information */}
              <Collapsible defaultOpen>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Delivery Agent Details
                      </CardTitle>
                      <ChevronDown className="h-5 w-5" />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      {result.agent_info.assigned ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">{result.agent_info.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{result.agent_info.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{result.agent_info.email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge variant={result.agent_info.is_online ? 'default' : 'secondary'}>
                              {result.agent_info.is_online ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No delivery agent assigned yet</p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
