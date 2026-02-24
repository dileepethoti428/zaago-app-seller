import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUnassignedOrders, UnassignedOrder, DateType } from '@/hooks/useUnassignedOrders';
import { useSellerLocationId } from '@/hooks/useDeliveryAgentsCapacity';
import { useAuth } from '@/context/AuthContext';
import { ManualAgentAssignmentModal } from '@/components/ManualAgentAssignmentModal';
import { CreateDeliveryAgentModal } from '@/components/CreateDeliveryAgentModal';
import { AlertTriangle, Users, UserX, Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function UnassignedOrders() {
  const { user } = useAuth();
  const { data: locationId, isLoading: locationLoading } = useSellerLocationId(user?.id);
  
  const [activeTab, setActiveTab] = useState<DateType>('tomorrow');
  const [selectedOrder, setSelectedOrder] = useState<UnassignedOrder | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch both today's and tomorrow's orders
  const { data: todayOrders, isLoading: todayLoading } = useUnassignedOrders('today');
  const { data: tomorrowOrders, isLoading: tomorrowLoading } = useUnassignedOrders('tomorrow');

  const isLoading = locationLoading || todayLoading || tomorrowLoading;

  // Get orders and counts based on active tab
  const orders = activeTab === 'today' ? todayOrders : tomorrowOrders;
  const noAgentsCount = orders?.filter((o) => o.reason === 'no_agents').length || 0;
  const atCapacityCount = orders?.filter((o) => o.reason === 'all_at_capacity').length || 0;
  const totalCount = orders?.length || 0;

  const todayCount = todayOrders?.length || 0;
  const tomorrowCount = tomorrowOrders?.length || 0;

  const todayDate = format(new Date(), 'EEEE, MMM d');
  const tomorrowDate = format(addDays(new Date(), 1), 'EEEE, MMM d');
  
  const headerText = activeTab === 'today'
    ? `Orders for Today (${todayDate})`
    : `Orders for Tomorrow (${tomorrowDate})`;

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

  const renderOrdersTable = (ordersList: UnassignedOrder[] | undefined) => {
    if (!ordersList || ordersList.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">All Orders Assigned!</h3>
          <p className="text-muted-foreground">
            {activeTab === 'today' 
              ? "No unassigned orders for today. All deliveries are covered."
              : "All orders are assigned for tomorrow."}
          </p>
        </div>
      );
    }

    return (
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
            {ordersList.map((order) => (
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
    );
  };

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
            {headerText} • Location ID: {locationId}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DateType)} defaultValue="tomorrow">
        <div className="overflow-x-auto -mx-3 px-3">
          <TabsList className="grid w-full max-w-md grid-cols-2 min-w-[320px]">
            <TabsTrigger value="today" className="flex items-center gap-2">
              Today (Live)
              {todayCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {todayCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tomorrow" className="flex items-center gap-2">
              Tomorrow (Planning)
              {tomorrowCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tomorrowCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Warning Banner for Today */}
        {activeTab === 'today' && todayCount > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ Unassigned orders for today require immediate action
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="overflow-x-auto -mx-3 px-3 pb-2 mt-4">
          <div className="flex gap-4 min-w-max">
          <Card className="min-w-[180px] flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Unassigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalCount}</p>
            </CardContent>
          </Card>

          <Card className="min-w-[180px] flex-1">
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

          <Card className="min-w-[180px] flex-1">
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
        </div>

        {/* Tab Content */}
        <TabsContent value="today" className="mt-4">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                Live Orders Requiring Immediate Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(todayOrders)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tomorrow" className="mt-4">
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Planning: Orders for Tomorrow
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(tomorrowOrders)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
