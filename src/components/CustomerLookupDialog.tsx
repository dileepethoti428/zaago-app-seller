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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, ChevronDown, Package, User, Store, Truck, Loader2, Phone, Mail, MapPin, Clock, CheckCircle, AlertCircle, Star, Award, Shield } from 'lucide-react';
import { useCustomerLookup } from '@/hooks/useCustomerLookup';
import { format } from 'date-fns';
import { DeliveryStatusTimeline } from './DeliveryStatusTimeline';

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
    return colors[status.toLowerCase()] || 'bg-gray-500';
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Customer Lookup</DialogTitle>
          <DialogDescription>
            Enter a tracking ID to view complete order, customer, seller, and delivery partner details
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
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="font-medium">₹{result.order_info.total_amount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Method</p>
                          <p className="font-medium">{result.order_info.payment_method}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Status</p>
                          <Badge variant={result.order_info.payment_status === 'Paid' ? 'default' : 'secondary'}>
                            {result.order_info.payment_status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pickup Status</p>
                          {result.order_info.pickup_status ? (
                            <Badge variant="outline">{result.order_info.pickup_status}</Badge>
                          ) : (
                            <p className="text-sm">N/A</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Created At</p>
                          <p className="text-sm">{format(new Date(result.order_info.created_at), 'PPp')}</p>
                        </div>
                        {result.order_info.delivered_at && (
                          <div>
                            <p className="text-sm text-muted-foreground">Delivered At</p>
                            <p className="text-sm">{format(new Date(result.order_info.delivered_at), 'PPp')}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.order_info.delivery_date && (
                          <div>
                            <p className="text-sm text-muted-foreground">Delivery Date</p>
                            <p className="text-sm">{result.order_info.delivery_date}</p>
                          </div>
                        )}
                        {result.order_info.delivery_time_slot && (
                          <div>
                            <p className="text-sm text-muted-foreground">Time Slot</p>
                            <p className="text-sm">{result.order_info.delivery_time_slot}</p>
                          </div>
                        )}
                      </div>

                      {result.order_info.otp_verified !== null && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">OTP Verification</p>
                            <div className="flex items-center gap-2">
                              {result.order_info.otp_verified ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-500">Verified</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm text-yellow-500">Pending</span>
                                </>
                              )}
                            </div>
                          </div>
                          {result.order_info.otp_masked && (
                            <div>
                              <p className="text-sm text-muted-foreground">OTP Code</p>
                              <p className="text-sm font-mono">{result.order_info.otp_masked}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {result.order_info.special_instructions && (
                        <div>
                          <p className="text-sm text-muted-foreground">Special Instructions</p>
                          <p className="text-sm">{result.order_info.special_instructions}</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Delivery Status Timeline */}
              {result.delivery_status && result.delivery_status.timeline?.length > 0 && (
                <Collapsible defaultOpen>
                  <Card>
                    <CardHeader>
                      <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Delivery Status
                        </CardTitle>
                        <ChevronDown className="h-5 w-5" />
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <DeliveryStatusTimeline 
                          timeline={result.delivery_status.timeline}
                          currentStatus={result.delivery_status.current_status}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

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
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{result.customer_info.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </p>
                        <p className="font-medium">{result.customer_info.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Delivery Address
                        </p>
                        {result.customer_info.full_address ? (
                          <div className="space-y-1">
                            {result.customer_info.address_label && (
                              <Badge variant="outline" className="mb-1">{result.customer_info.address_label}</Badge>
                            )}
                            <p className="text-sm font-medium">{result.customer_info.full_address}</p>
                            {result.customer_info.landmark && (
                              <p className="text-sm text-muted-foreground">Landmark: {result.customer_info.landmark}</p>
                            )}
                            {result.customer_info.city && result.customer_info.state && (
                              <p className="text-sm">
                                {result.customer_info.city}, {result.customer_info.state} - {result.customer_info.pincode}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm">
                            {typeof result.customer_info.delivery_address === 'object'
                              ? result.customer_info.delivery_address?.formatted_address ||
                                JSON.stringify(result.customer_info.delivery_address)
                              : result.customer_info.delivery_address}
                          </p>
                        )}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        Delivery Partner Details
                      </CardTitle>
                      <ChevronDown className="h-5 w-5" />
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {result.agent_info.assigned ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Name</p>
                              <p className="font-medium">{result.agent_info.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <div className="flex items-center gap-2">
                                <Badge variant={result.agent_info.is_online ? 'default' : 'secondary'}>
                                  {result.agent_info.is_online ? 'Online' : 'Offline'}
                                </Badge>
                                {result.agent_info.is_active !== null && (
                                  <Badge variant={result.agent_info.is_active ? 'default' : 'destructive'}>
                                    {result.agent_info.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Phone
                              </p>
                              <p className="font-medium">{result.agent_info.phone}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email
                              </p>
                              <p className="text-sm">{result.agent_info.email}</p>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          {(result.agent_info.average_rating !== null || result.agent_info.total_deliveries !== null) && (
                            <div className="border-t pt-4 space-y-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                Performance Metrics
                              </h4>
                              
                              {result.agent_info.average_rating !== null && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Average Rating</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`h-4 w-4 ${
                                            star <= Math.floor(result.agent_info.average_rating!)
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : star - 0.5 <= result.agent_info.average_rating!
                                              ? 'fill-yellow-400/50 text-yellow-400'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-sm font-medium">
                                      {result.agent_info.average_rating.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                {result.agent_info.total_deliveries !== null && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Deliveries</p>
                                    <p className="text-2xl font-bold">{result.agent_info.total_deliveries}</p>
                                  </div>
                                )}
                                {result.agent_info.deliveries_today !== null && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Today's Deliveries</p>
                                    <p className="text-2xl font-bold">{result.agent_info.deliveries_today}</p>
                                  </div>
                                )}
                              </div>

                              {result.agent_info.performance_score !== null && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                      <Shield className="h-4 w-4" />
                                      Performance Score
                                    </p>
                                    <span className="font-medium">{result.agent_info.performance_score}%</span>
                                  </div>
                                  <Progress value={result.agent_info.performance_score} className="h-2" />
                                </div>
                              )}

                              {result.agent_info.last_delivery_at && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Last Delivery</p>
                                  <p className="text-sm">{format(new Date(result.agent_info.last_delivery_at), 'PPp')}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No delivery partner has been assigned to this order yet.
                          </AlertDescription>
                        </Alert>
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
