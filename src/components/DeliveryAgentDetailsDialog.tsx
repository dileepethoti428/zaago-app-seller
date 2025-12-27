import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Phone, Mail, Truck, Star, Calendar, MapPin, 
  CheckCircle, Clock, Package 
} from 'lucide-react';
import { format } from 'date-fns';

export interface AgentDetails {
  id: string;
  agent_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_online: boolean;
  is_active?: boolean;
  max_capacity: number;
  orders_today: number;
  orders_tomorrow: number;
  available_slots: number;
  distance_km?: number;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  total_deliveries?: number | null;
  average_rating?: number | null;
  performance_score?: number | null;
  verification_status?: string | null;
  profile_image?: string | null;
  created_at?: string | null;
  last_delivery_at?: string | null;
  last_status_change?: string | null;
}

interface DeliveryAgentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentDetails | null;
}

export function DeliveryAgentDetailsDialog({
  open,
  onOpenChange,
  agent,
}: DeliveryAgentDetailsDialogProps) {
  if (!agent) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={agent.profile_image || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {agent.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="block">{agent.name}</span>
              <Badge
                variant={agent.is_online ? 'default' : 'secondary'}
                className={agent.is_online 
                  ? 'bg-green-500/20 text-green-500 text-xs' 
                  : 'text-xs'
                }
              >
                {agent.is_online ? '🟢 Online' : '🔴 Offline'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Contact Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
            <div className="space-y-2">
              {agent.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{agent.phone}</span>
                </div>
              )}
              {agent.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{agent.email}</span>
                </div>
              )}
              {agent.distance_km !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{agent.distance_km.toFixed(1)} km away</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Vehicle Info */}
          {(agent.vehicle_type || agent.vehicle_number) && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Vehicle Information</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {agent.vehicle_type || 'Unknown'} 
                    {agent.vehicle_number && ` - ${agent.vehicle_number}`}
                  </span>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Orders & Capacity */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Orders & Capacity</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{agent.orders_today}</p>
                <p className="text-xs text-muted-foreground">Orders Today</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{agent.orders_tomorrow}</p>
                <p className="text-xs text-muted-foreground">Orders Tomorrow</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{agent.max_capacity}</p>
                <p className="text-xs text-muted-foreground">Max Capacity</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-500">{agent.available_slots}</p>
                <p className="text-xs text-muted-foreground">Available Slots</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Performance Stats */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Performance</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>{agent.total_deliveries ?? 0}</strong> total deliveries
                </span>
              </div>
              {agent.average_rating !== null && agent.average_rating !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>
                    <strong>{Number(agent.average_rating).toFixed(1)}</strong> rating
                  </span>
                </div>
              )}
              {agent.performance_score !== null && agent.performance_score !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    <strong>{Number(agent.performance_score).toFixed(0)}%</strong> performance
                  </span>
                </div>
              )}
              {agent.verification_status && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={agent.verification_status === 'verified' ? 'default' : 'secondary'}>
                    {agent.verification_status}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Activity</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              {agent.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>Joined: {formatDate(agent.created_at)}</span>
                </div>
              )}
              {agent.last_delivery_at && (
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  <span>Last delivery: {formatDate(agent.last_delivery_at)}</span>
                </div>
              )}
              {agent.last_status_change && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Status changed: {formatDate(agent.last_status_change)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
