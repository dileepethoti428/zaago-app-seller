import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDeliveryAgentsWithCapacity, useUpdateAgentCapacity, useSellerLocationId } from '@/hooks/useDeliveryAgentsCapacity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Users, MapPin, Package, Edit2, Check, X, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DeliveryAgents() {
  const { user } = useAuth();
  const { data: locationId, isLoading: locationLoading } = useSellerLocationId(user?.id);
  const { data: agents, isLoading: agentsLoading, refetch } = useDeliveryAgentsWithCapacity(locationId);
  const updateCapacity = useUpdateAgentCapacity();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(30);

  const handleEdit = (agentId: string, currentCapacity: number) => {
    setEditingId(agentId);
    setEditValue(currentCapacity);
  };

  const handleSave = async (agentId: string) => {
    await updateCapacity.mutateAsync({ agentId, newCapacity: editValue });
    setEditingId(null);
    refetch();
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue(30);
  };

  const isLoading = locationLoading || agentsLoading;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-7 w-7 text-primary" />
              Delivery Agents
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage delivery agents and their capacity for your location
            </p>
          </div>
          {locationId && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Location {locationId}
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Agents</p>
                  <p className="text-2xl font-bold">{agents?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Package className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tomorrow's Orders</p>
                  <p className="text-2xl font-bold">
                    {agents?.reduce((sum, a) => sum + a.orders_tomorrow, 0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Truck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Slots</p>
                  <p className="text-2xl font-bold">
                    {agents?.reduce((sum, a) => sum + Math.max(0, a.available_slots), 0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Capacity Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !locationId ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No location configured for your seller account.</p>
                <p className="text-sm mt-1">Please contact admin to set up your location.</p>
              </div>
            ) : agents && agents.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent Name</TableHead>
                      <TableHead className="text-center">Location ID</TableHead>
                      <TableHead className="text-center">Orders Tomorrow</TableHead>
                      <TableHead className="text-center">Max Capacity</TableHead>
                      <TableHead className="text-center">Available Slots</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{agent.location_id}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{agent.orders_tomorrow}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === agent.id ? (
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={editValue}
                              onChange={(e) => setEditValue(parseInt(e.target.value) || 30)}
                              className="w-20 mx-auto text-center"
                            />
                          ) : (
                            <span className="font-semibold">{agent.max_capacity}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={agent.available_slots > 0 ? 'default' : 'destructive'}
                            className={agent.available_slots > 0 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : ''}
                          >
                            {agent.available_slots}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === agent.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSave(agent.id)}
                                disabled={updateCapacity.isPending}
                                className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              >
                                {updateCapacity.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancel}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(agent.id, agent.max_capacity)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active delivery agents in your location.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
