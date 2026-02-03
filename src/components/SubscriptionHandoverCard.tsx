import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Package, 
  Users, 
  Clock, 
  Sunrise,
  AlertTriangle,
  Phone
} from 'lucide-react';
import { useSubscriptionHandover, HandoverDate, HandoverAgent } from '@/hooks/useSubscriptionHandover';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isUrgentDelivery(timeSlot: string | null): boolean {
  if (!timeSlot) return false;
  const now = new Date();
  const currentHour = now.getHours();
  
  // Extract start hour from time slot (e.g., "5:30-7:00 AM" -> 5)
  const match = timeSlot.match(/(\d{1,2}):/);
  if (!match) return false;
  
  const slotHour = parseInt(match[1], 10);
  // Urgent if delivery is within 1 hour
  return slotHour <= currentHour + 1 && slotHour >= currentHour;
}

interface AgentCardProps {
  agent: HandoverAgent;
  isToday: boolean;
}

function AgentCard({ agent, isToday }: AgentCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const hasUrgentProducts = isToday && agent.products.some(p => isUrgentDelivery(p.deliveryTimeSlot));

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
            "hover:bg-muted/50 border",
            hasUrgentProducts ? "border-destructive/50 bg-destructive/5" : "border-border"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={agent.agentProfileImage || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(agent.agentName)}
                </AvatarFallback>
              </Avatar>
              {hasUrgentProducts && (
                <div className="absolute -top-1 -right-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{agent.agentName}</span>
                {hasUrgentProducts && (
                  <Badge variant="destructive" className="text-xs">URGENT</Badge>
                )}
              </div>
              {agent.agentPhone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{agent.agentPhone}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {agent.totalOrders} {agent.totalOrders === 1 ? 'order' : 'orders'}
            </Badge>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-4 space-y-2">
          {agent.products.map((product) => (
            <div
              key={`${product.productId}-${product.deliveryTimeSlot}`}
              className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/50"
            >
              <div className="flex items-center gap-3">
                {product.productImage ? (
                  <img
                    src={product.productImage}
                    alt={product.productName}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm font-medium">{product.productName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {product.totalQuantity} {product.productUnit}
                </Badge>
                {product.deliveryTimeSlot && (
                  <Badge 
                    variant={isUrgentDelivery(product.deliveryTimeSlot) ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {product.deliveryTimeSlot}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SubscriptionHandoverCard() {
  const [selectedDate, setSelectedDate] = useState<HandoverDate>('today');
  const { agents, summary, isLoading, error, refetch, lastUpdated } = useSubscriptionHandover(selectedDate);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Subscription Delivery Handover</CardTitle>
            <CardDescription>Hand over products to delivery agents</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedDate} onValueChange={(v) => setSelectedDate(v as HandoverDate)}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        {!isLoading && !error && agents.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {summary.totalAgents} {summary.totalAgents === 1 ? 'Agent' : 'Agents'}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Package className="h-3 w-3" />
              {summary.totalOrders} Orders
            </Badge>
            {summary.hasEarlyMorning && (
              <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning-foreground border-warning/30">
                <Sunrise className="h-3 w-3" />
                Early Morning
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-2">Failed to load handover data</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              No subscription deliveries assigned for {selectedDate === 'today' ? 'today' : 'tomorrow'}
            </p>
            <p className="text-xs mt-1">Orders may be waiting for agent assignment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <AgentCard 
                key={agent.agentId} 
                agent={agent} 
                isToday={selectedDate === 'today'}
              />
            ))}
          </div>
        )}

        {/* Last updated timestamp */}
        {lastUpdated && !isLoading && (
          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground text-center">
            Last updated: {format(lastUpdated, 'h:mm:ss a')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
