import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUnassignedOrders, UnassignedOrder } from '@/hooks/useUnassignedOrders';
import { useSellerLocationId } from '@/hooks/useDeliveryAgentsCapacity';
import { useAuth } from '@/context/AuthContext';
import { ManualAgentAssignmentModal } from '@/components/ManualAgentAssignmentModal';
import { CreateDeliveryAgentModal } from '@/components/CreateDeliveryAgentModal';
import { AlertTriangle, Users, UserX, Loader2, UserPlus } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function UnassignedOrders() {
  const { user } = useAuth();
  const { data: locationId, isLoading: locationLoading } = useSellerLocationId(user?.id);
  const { data: orders, isLoading: ordersLoading } = useUnassignedOrders();

  const [selectedOrder, setSelectedOrder] = useState<UnassignedOrder | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isLoading = locationLoading || ordersLoading;

  const noAgentsCount = orders?.filter((o) => o.reason === 'no_agents').length || 0;
  const atCapacityCount = orders?.filter((o) => o.reason === 'all_at_capacity').length || 0;
  const totalCount = orders?.length || 0;

  const tomorrow = format(addDays(new Date(), 1), 'EEEE, MMM d');

  const handleAssignClick = (order: UnassignedOrder) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const handleCreateClick = (order: UnassignedOrder) => {
    setSelectedOrder(order);
    setShowCreateModal(true);
  };

  const handleCreateFromAssignModal = () => {
    setShowAssignModal(false);
    setShowCreateModal(true);
  };

  const getReasonBadge = (reason: 'no_agents' | 'all_at_capacity') => {
    if (reason === 'no_agents') {
      return (
        <Badge variant="destructive" className="whitespace-nowrap">
          <UserX className="h-3 w-3 mr-1" />
          No agents available
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="whitespace-nowrap bg-amber-500/20 text-amber-600 border-amber-500/30">
        <Users className="h-3 w-3 mr-1" />
        All at max capacity
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Unassigned Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            Orders for {tomorrow} • Location ID: {locationId}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4 text-destructive" />
              No Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{noAgentsCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              At Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{atCapacityCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Requiring Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.customer_name}
                      </TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell className="text-center">{order.quantity}</TableCell>
                      <TableCell>{getReasonBadge(order.reason)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignClick(order)}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCreateClick(order)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Create & Assign
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">All Orders Assigned!</h3>
              <p className="text-muted-foreground">
                There are no unassigned orders for tomorrow.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedOrder && locationId && (
        <>
          <ManualAgentAssignmentModal
            open={showAssignModal}
            onOpenChange={setShowAssignModal}
            orderId={selectedOrder.id}
            locationId={locationId}
            onCreateNewAgent={handleCreateFromAssignModal}
          />
          <CreateDeliveryAgentModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
            locationId={locationId}
            pendingOrderId={selectedOrder.id}
          />
        </>
      )}
    </div>
  );
}
