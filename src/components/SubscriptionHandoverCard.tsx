import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Package, Users, CheckCircle2 } from 'lucide-react';
import { useSubscriptionHandover, HandoverDate, HandoverAgent } from '@/hooks/useSubscriptionHandover';
import { useHandoverConfirmation } from '@/hooks/useHandoverConfirmation';
import { AgentHandoverCard } from '@/components/handover/AgentHandoverCard';
import { HandoverConfirmDialog } from '@/components/handover/HandoverConfirmDialog';
import { cn } from '@/lib/utils';

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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<HandoverAgent | null>(null);

  const { agents, summary, isLoading, error, refetch, lastUpdated } = useSubscriptionHandover(selectedDate);

  const {
    getConfirmation,
    confirmedCount,
    confirmHandover,
    undoConfirmation,
    isConfirming,
    isUndoing,
  } = useHandoverConfirmation(selectedDate);

  const handleConfirmClick = (agent: HandoverAgent) => {
    setSelectedAgent(agent);
    setConfirmDialogOpen(true);
  };

  const handleConfirmHandover = () => {
    if (selectedAgent) {
      confirmHandover(selectedAgent.agentId);
      setConfirmDialogOpen(false);
      setSelectedAgent(null);
    }
  };

  const handleUndoClick = (agentId: string) => {
    undoConfirmation(agentId);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Subscription Delivery Handover</CardTitle>
              <CardDescription>Hand over products to delivery partners</CardDescription>
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
              <Badge
                variant={confirmedCount === agents.length && agents.length > 0 ? 'default' : 'outline'}
                className={cn(
                  'gap-1',
                  confirmedCount === agents.length && agents.length > 0 && 'bg-green-600 hover:bg-green-700'
                )}
              >
                <CheckCircle2 className="h-3 w-3" />
                {confirmedCount}/{agents.length} Confirmed
              </Badge>
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
                <AgentHandoverCard
                  key={agent.agentId}
                  agent={agent}
                  confirmation={getConfirmation(agent.agentId)}
                  onConfirmClick={() => handleConfirmClick(agent)}
                  onUndoClick={() => handleUndoClick(agent.agentId)}
                  isConfirming={isConfirming}
                  isUndoing={isUndoing}
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

      {/* Confirmation Dialog */}
      <HandoverConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        agent={selectedAgent}
        selectedDate={selectedDate}
        onConfirm={handleConfirmHandover}
        isConfirming={isConfirming}
      />
    </>
  );
}
